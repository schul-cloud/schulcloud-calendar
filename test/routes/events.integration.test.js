const expect = require('chai').expect;
const nock = require('nock');
const request = require('supertest');

const app = require('../../src/app');
const { SERVER_SCOPES_URI, SCHULCLOUD_BASE_PATH } = require('../../src/config');
const db = require('../../src/infrastructure/databasePromise');
const {
	dbUtils,
	serverMockData: { createOverlayWithDefaultScopes, addCourseScope },
	convertEventToJsonApi,
	getDate,
} = require('../testutils');

/** tests */
describe('routes/events', () => {
	const userId = '59898b4a26ffc20c510cfcf0';
	let resetDB;
	let clearData;
	let calendarService;
	// TODO: 
	// add read permission user
	// add additional user to test other scopes (no permissions to see it)
	const resolvedServerScopes = createOverlayWithDefaultScopes();

	const addTestEvents = async ({ scopeId = '59cce16281297026d02cde123', summary, startDate, endDate, repeat_freq, repeat_until, repeat_wkst}) => {
		const data = {
			courseId: scopeId,
			scopeId,
			summary,
			startDate,
			endDate,
			repeat_freq,
			repeat_until,
			repeat_wkst
		};

		await nock(SCHULCLOUD_BASE_PATH)
			.get(uri => uri.includes(SERVER_SCOPES_URI))
			.reply(200, () => {
				return resolvedServerScopes;
			});

		const result = await request(app)
			.post('/events')
			.send(convertEventToJsonApi(data))
			.set('Authorization', userId);

			return result.body.data;
	}

	beforeEach(async () => {
		await nock(SCHULCLOUD_BASE_PATH)
			.get(uri => uri.includes(SERVER_SCOPES_URI))
			.reply(200, () => {
				return resolvedServerScopes;
			});
	});

	before(async () => {
		({ resetDB, clearData } = dbUtils(db));
		await resetDB();
		calendarService = await app.listen(3001);
	});

	after(async () => {
		await clearData();
		await calendarService.close();
	});

	describe('events', () => {
		describe('POST', () => {
			const scopeId = '59cce16281297026d02cde123';
			const courseName = 'post test';
			before(async () => {
				await addCourseScope(resolvedServerScopes, scopeId, courseName, true);
			});

			after(async () => {
				resolvedServerScopes.data = resolvedServerScopes.data.filter(scope => scope.id !== scopeId);
				await resetDB();
			});

			// only read permissions
			// no permissions

			it('create event', async () => {
				const eventData = convertEventToJsonApi({
					courseId: scopeId,
					scopeId,
					summary: courseName,
				});

			   const result = await request(app)
					.post('/events')
					.send(eventData)
					.set('Authorization', userId);
				
				const { data } = result.body;

				expect(data).to.be.an('array').to.have.lengthOf(1);

				const relationships = data[0].relationships['scope-ids'];

				expect(relationships).to.be.an('array').to.have.lengthOf(1);
				expect(relationships[0]).to.be.equal(scopeId);

				expect(data[0].attributes.summary).to.be.equal(courseName);
			});
		});
	
		describe('FIND with scope and timebox', () => {
			// add many many test see params in events route
			const scopeId = '59cce16281297026d02abc123';
			const scopeIdThatIsNotRequested = '59cce16281297026d02xyz999';
			const scopeIdWithoutReadPermissions = '59cce16281297026d02xyz000'
			const courseName = 'find time box test';
			let events;
			const baseDate = new Date();

			before(async () => {
				addCourseScope(resolvedServerScopes, scopeId, courseName, true);
				addCourseScope(resolvedServerScopes, scopeIdThatIsNotRequested, courseName, true);

				// fix BUG
				// add user for scopeIdWithoutReadPermissions
				events = await Promise.all([
					addTestEvents({ scopeId, startDate: getDate(-30, baseDate), endDate: getDate(30, baseDate), summary: 'touched start'}),
					addTestEvents({ scopeId, startDate: getDate(15, baseDate), endDate: getDate(45, baseDate), summary: 'in time'}),
					addTestEvents({ scopeId, startDate: getDate(30, baseDate), endDate: getDate(90, baseDate), summary: 'touched end'}),
					addTestEvents({ scopeId, startDate: getDate(-30, baseDate), endDate: getDate(90, baseDate), summary: 'start before and end after'}),
					addTestEvents({ scopeId, startDate: getDate(-60, baseDate), endDate: getDate(-30, baseDate), summary: 'end before - should not found'}),
					addTestEvents({ scopeId, startDate: getDate(90, baseDate), endDate: getDate(120, baseDate), summary: 'start after - should not found'}),
					addTestEvents({ scopeId: scopeIdThatIsNotRequested, startDate: getDate(15, baseDate), endDate: getDate(45, baseDate), summary: 'other scope - should not found'}),
					// can not create at the moment -> fix over mock
					// addTestEvents({ scopeId: scopeIdWithoutReadPermissions, startDate: getDate(15), endDate: getDate(45), summary: 'no permissions - should not found'}),
					addTestEvents({ scopeId, startDate: getDate(-7200, baseDate), endDate: getDate(-7140, baseDate), summary: 'weekly every monday', frequency: 'WEEKLY', repeat_until: getDate(3600, baseDate), weekday: ['MO']}),
					addTestEvents({ scopeId, startDate: getDate(-7200, baseDate), endDate: getDate(-7140, baseDate), summary: 'weekly every monday - should not found', frequency: 'WEEKLY', repeat_until: getDate(-3600, baseDate), weekday: ['MO']}),
				]);
			});

			after(async () => {
				resolvedServerScopes.data = resolvedServerScopes.data.filter(scope => scope.id !== scopeId);
				// TODO missing filter
				await resetDB();
			});

			it('find all events that touched by requested time box and scope', async () => {
				const result = await request(app)
					.get('/events')
					.query({
						from: getDate(0, baseDate),
						until: getDate(60, baseDate),
						'scope-id': scopeId
					})
					.set('Authorization', userId)

					// shoud.include
				expect(result.body.data.some((e) => e.attributes.summary === 'touched start'), 'touched start').to.be.true;
				expect(result.body.data.some((e) => e.attributes.summary === 'in time'), 'in time').to.be.true;
				expect(result.body.data.some((e) => e.attributes.summary === 'touched end'), 'touched end').to.be.true;
				expect(result.body.data.some((e) => e.attributes.summary === 'start before and end after'), 'start before and end after').to.be.true;
				expect(result.body.data.some((e) => e.attributes.summary === 'touched start'), 'touched start').to.be.true;
				expect(result.body.data.some((e) => e.attributes.summary === 'weekly every monday'), 'weekly every monday').to.be.true;

				expect(result.body.data.some((e) => e.attributes.summary === 'end before - should not found'), 'end before - should not found').to.be.false;
				expect(result.body.data.some((e) => e.attributes.summary === 'start after - should not found'), 'start after - should not found').to.be.false;
				expect(result.body.data.some((e) => e.attributes.summary === 'other scope - should not found'), 'other scope - should not found').to.be.false;
				expect(result.body.data.some((e) => e.attributes.summary === 'weekly every monday - should not found'), 'weekly every monday - should not found').to.be.false;
			});
		});

		describe('DELETE', () => {
			const scopeId = '59cce16281297026d02abc123';
			const courseName = 'delete event test case';
			const baseDate = new Date();
			let eventId;
			

			before(async () => {
				addCourseScope(resolvedServerScopes, scopeId, courseName, true);
				const events = await addTestEvents({ scopeId, startDate: getDate(-30, baseDate), endDate: getDate(30, baseDate), summary: 'my event to be deleted'});
				expect(events[0]).to.not.be.null;
				eventId = events[0].attributes.uid;
			});

			after(async () => {
				resolvedServerScopes.data = resolvedServerScopes.data.filter(scope => scope.id !== scopeId);
				await resetDB(); 
			});

			// has write permissions
			it('delete an event where I have write permissions', async () => {	
				const result = await request(app)
				.delete(`/events/${eventId}`)
				.set('Authorization', userId)

				//must not show up anymore
				expect(result.statusCode).to.equal(204);
				// test DB --> add find all db call to test utils
			});

			// only read permissions
			// no permissions
			// => for eventId as param
		});
	
		describe('PUT', () => {
			// has write permissions
			// only read permissions
			// no permissions
			// => for eventId as param
		});
	});
});

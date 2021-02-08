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
	let server;
	const resolvedServerScopes = createOverlayWithDefaultScopes();

	const addCourseTestEvent = async ({ scopeId = '59cce16281297026d02cde123', summary = 'event1', repeat_until, last_modified, weekday}) => {
		const data = { scopeId, summary, startDate: getDate(-30), endDate: getDate(30), repeat_freq: "WEEKLY", repeat_until, last_modified, weekday};
		return addTestEvents(data);
	}

	const addTestEvents = async ({ scopeId = '59cce16281297026d02cde123', summary, startDate, endDate, repeat_freq, repeat_until, last_modified, weekday}) => {
		const data = {
			courseId: scopeId,
			scopeId,
			summary,
			startDate,
			endDate,
			last_modified,
			frequency: repeat_freq,
			repeat_until,
			weekday,
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
		server = await app.listen(3001);
	});

	after(async () => {
		await clearData();
		await server.close();
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
			}); 

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
		/*
		describe('FIND all', () => {
			it('get all for this user', async () => {
			   const result = await request(app)
					.get('/events')
					.query({
						all: true,
					})
					.set('Authorization', userId);

				expect(result.body.data).to.be.an('array').to.have.lengthOf(5);
			});
		}); */
	
		describe('FIND with scope and timebox', () => {
			const scopeId = '59cce16281297026d02abc123';
			const scopeIdThatIsNotRequested = '59cce16281297026d02xyz999';
			const scopeIdWithoutReadPermissions = '59cce16281297026d02xyz000'
			const courseName = 'find time box test';
			let events;
			before(async () => {
				addCourseScope(resolvedServerScopes, scopeId, courseName, true);
				addCourseScope(resolvedServerScopes, scopeIdThatIsNotRequested, courseName, true);

				events = await Promise.all([
					addTestEvents({ scopeId, startDate: getDate(-30), endDate: getDate(30), summary: 'touched start'}),
					addTestEvents({ scopeId, startDate: getDate(15), endDate: getDate(45), summary: 'in time'}),
					addTestEvents({ scopeId, startDate: getDate(30), endDate: getDate(90), summary: 'touched end'}),
					addTestEvents({ scopeId, startDate: getDate(-30), endDate: getDate(90), summary: 'start before and end after'}),
					addTestEvents({ scopeId, startDate: getDate(-60), endDate: getDate(-30), summary: 'end before - should not found'}),
					addTestEvents({ scopeId, startDate: getDate(90), endDate: getDate(120), summary: 'start after - should not found'}),
					addTestEvents({ scopeId: scopeIdThatIsNotRequested, startDate: getDate(15), endDate: getDate(45), summary: 'other scope - should not found'}),
					// can not create at the moment -> fix over mock
					// addTestEvents({ scopeId: scopeIdWithoutReadPermissions, startDate: getDate(15), endDate: getDate(45), summary: 'no permissions - should not found'}),
					addTestEvents({ scopeId, startDate: getDate(-7200), endDate: getDate(-7140), summary: 'weekly every monday', frequency: 'WEEKLY', repeat_until: getDate(3600), weekday: ['MO']}),
					addTestEvents({ scopeId, startDate: getDate(-7200), endDate: getDate(-7140), summary: 'weekly every monday - should not found', frequency: 'WEEKLY', repeat_until: getDate(-3600), weekday: ['MO']}),
				]);
			});

			after(async () => {
				resolvedServerScopes.data = resolvedServerScopes.data.filter(scope => scope.id !== scopeId);
				await resetDB();
			});

			it('find all events that touched by requested time box and scope', async () => {
				const result = await request(app)
					.get('/events')
					.query({
						from: getDate(0),
						until: getDate(60),
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

		describe('DELETE by scope', async () => {
			const scopeId = '59cce16281297026d02cde123';
			const anotherScopeId = 'another_id';
			const courseName = 'post test';
			let events;
			before(async () => {
				await addCourseScope(resolvedServerScopes, scopeId, courseName, true);
				events = await Promise.all([
					addTestEvents({ scopeId, startDate: getDate(-30), endDate: getDate(30), summary: 'touched start'}),
					addTestEvents({ scopeId, startDate: getDate(15), endDate: getDate(45), summary: 'in time'}),
					addTestEvents({ scopeId, startDate: getDate(30), endDate: getDate(90), summary: 'touched end'}),
					addTestEvents({ scopeId, startDate: getDate(-30), endDate: getDate(90), summary: 'start before and end after'}),
					addTestEvents({ scopeId, startDate: getDate(-60), endDate: getDate(-30), summary: 'end before - should not found'}),
					addTestEvents({ scopeId, startDate: getDate(90), endDate: getDate(120), summary: 'start after - should not found'}),

					addTestEvents({ scopeId: anotherScopeId, startDate: getDate(90), endDate: getDate(120), summary: 'start after - should not found'}),
					addTestEvents({ scopeId: anotherScopeId, startDate: getDate(90), endDate: getDate(120), summary: 'start after - should not found'}),
					addTestEvents({ scopeId: anotherScopeId, startDate: getDate(90), endDate: getDate(120), summary: 'start after - should not found'}),
					addTestEvents({ scopeId: anotherScopeId, startDate: getDate(90), endDate: getDate(120), summary: 'start after - should not found'})
				]);

			});

			after(async () => {
				resolvedServerScopes.data = resolvedServerScopes.data.filter(scope => scope.id !== scopeId);
				await resetDB();
			});

			it('should successfully delete all events for the scope and not delete other events', async () => {
				const props = [scopeId];
				let resultForScopeToBeDeleted = await db.query('SELECT id from events where scope_id = $1', props);
				let expectedResultNotToBeDeleted = await db.query('SELECT id from events where scope_id != $1', props);
				expect(resultForScopeToBeDeleted.length).to.be.greaterThan(0);
				expect(expectedResultNotToBeDeleted.length).to.be.greaterThan(0);

				const result = await request(app)
					.delete(`/scopes/${scopeId}`)
					.set('Authorization', userId);

				resultForScopeToBeDeleted = await db.query('SELECT id from events where scope_id = $1', props);
				let actualResultNotToBeDeleted = await db.query('SELECT id from events where scope_id != $1', props);

				expect(result.statusCode).to.be.equal(204);
				expect(resultForScopeToBeDeleted.length).to.be.equal(0);
				// check that nothing except expected values was deleted
				expect(actualResultNotToBeDeleted.length).to.be.greaterThan(0);
				expect(expectedResultNotToBeDeleted).to.be.deep.equal(actualResultNotToBeDeleted);
			});
		});
		describe('DELETE Duplicates', async () => {
			const scopeId = '59cce16281297026d02cde123';
			const anotherScopeId = 'another_id';
			const courseName = 'post test';
			let events;
			before(async () => {
				await addCourseScope(resolvedServerScopes, scopeId, courseName, true);
				await addCourseScope(resolvedServerScopes, anotherScopeId, courseName, true);

				events = await Promise.all([
					// last events
					addCourseTestEvent({ scopeId, summary: "orig", weekday: "MO", last_modified: getDate(-30)}),
					addCourseTestEvent({ scopeId, summary: "orig", weekday: "TU", last_modified: getDate(-30)}),
					addCourseTestEvent({ scopeId, summary: "orig", weekday: "WE", last_modified: getDate(-30)}),

					// duplicates
					addCourseTestEvent({ scopeId, summary: "dup", weekday: "MO", last_modified: getDate(-60)}),
					addCourseTestEvent({ scopeId, summary: "dup", weekday: "TU", last_modified: getDate(-60)}),
					addCourseTestEvent({ scopeId, summary: "dup", weekday: "WE", last_modified: getDate(-60)}),

					// other
					addCourseTestEvent({ scopeId: anotherScopeId, summary: "other", weekday: "MO", last_modified: getDate(-30)}),
					addCourseTestEvent({ scopeId: anotherScopeId, summary: "other", weekday: "TU", last_modified: getDate(-30)}),
					addCourseTestEvent({ scopeId: anotherScopeId, summary: "other", weekday: "WE", last_modified: getDate(-30)}),
				]);

			});

			after(async () => {
				resolvedServerScopes.data = resolvedServerScopes.data.filter(scope => scope.id !== scopeId);
				await resetDB();
			});

			it('should successfully delete duplicates and not delete not duplicates', async () => {
				const props = [scopeId, 'dup'];
				let resultsToBeDeleted = await db.query("SELECT id from events where scope_id = $1 and summary = $2", props);
				let expectedResultNotToBeDeleted = await db.query("SELECT id from events where scope_id != $1 or summary != $2", props);
				expect(resultsToBeDeleted.length).to.be.greaterThan(0);
				expect(expectedResultNotToBeDeleted.length).to.be.greaterThan(0);

				const result = await request(app)
					.delete(`/events/duplicates`);

				resultsToBeDeleted = await db.query("SELECT id from events where scope_id = $1 and summary = $2", props);
				let actualResultNotToBeDeleted = await db.query("SELECT id from events where scope_id != $1 or summary != $2", props);

				expect(result.statusCode).to.be.equal(204);
				expect(resultsToBeDeleted.length).to.be.equal(0);
				// check that nothing except expected values was deleted
				expect(actualResultNotToBeDeleted.length).to.be.greaterThan(0);
				expect(expectedResultNotToBeDeleted).to.be.deep.equal(actualResultNotToBeDeleted);
			});
		});

		describe('PUT', () => {
	
		});
	});

	describe('isc', () => {
		describe('CREATE', () => {

		});
	});
});

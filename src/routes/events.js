const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const cors = require('cors');
const config = require('../config');
const corsOptions = {
	origin: config.CORS_ORIGIN
};
router.use(cors(corsOptions));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// authentication, authorization and preprocessing
const { authenticateFromHeaderField, isMigration } = require('../security/authentication');
const { authorizeAccessToScopeId, authorizeAccessToObjects, authorizeWithPotentialScopeIds } = require('../security/authorization');
const jsonApiToJson = require('../parsers/event/jsonApiToJson');
const icsToJson = require('../parsers/event/icsToJson');

// response
const returnSuccess = require('../utils/response/returnSuccess');
const sendNotification = require('../services/sendNotification');
const eventsToJsonApi = require('../parsers/event/eventsToJsonApi');
const eventsToIcsInJsonApi = require('../parsers/event/eventsToIcsInJsonApi');

// content
const getEvents = require('../services/events/getEvents');
const getOriginalEvent = require('../queries/original-events/getOriginalEvent');
const insertEvents = require('../services/events/insertEvents');
const { deleteDuplicatedEvents } = require('../services/events/deleteDuplicatedEvents');
const { deleteEventWithScope, deleteAllEventsForScope } = require('../services/events/deleteEventWithScope');
const updateEvents = require('../services/events/updateEvents');

/* routes */

router.get('/events', authenticateFromHeaderField, function (req, res, next) {
	const filter = {
		scopeId: req.query['scope-id'],
		eventId: req.query['event-id'],
		from: req.query['from'],
		until: req.query['until'],
		all: req.query['all']
	};

	if (['1', 1, 'true'].includes(filter.all)) {
		filter.all = true;
	} else if(['0', 0, 'false'].includes(filter.all)) {
		filter.all = false;
	}

	const user = req.user;
	authorizeAccessToScopeId(user, filter.scopeId)
		.then(() => getEvents(filter, user.scopes))
		.then((events) => authorizeAccessToObjects(user, 'can-read', events))
		.then(eventsToJsonApi)
		.then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
		.catch(next);
});

router.post('/events', jsonApiToJson, authenticateFromHeaderField, function (req, res, next) {
	handlePost(req, res, next, eventsToJsonApi);
});

router.post('/events/ics', icsToJson, authenticateFromHeaderField, function (req, res, next) {
	handlePost(req, res, next, eventsToIcsInJsonApi);
});

function handlePost(req, res, next, outputFormatter) {
	const user = req.user;
	const events = req.events;

	authorizeAccessToObjects(user, 'can-write', events)
		.then((events) => doInserts(events, user))
		.then(sendInsertNotification)
		.then(outputFormatter)
		.then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
		.catch(next);
}

function doInserts(events, user) {
	return new Promise(function (resolve, reject) {
		insertEvents(events, user)
			.then(resolve)
			.catch(reject);
	});
}

function sendInsertNotification(insertedEvents) {
	insertedEvents.forEach((insertedEvent) => {
		const {scope_id, summary, dtstart, dtend} = insertedEvent;
		sendNotification.forNewEvent(scope_id, summary, dtstart, dtend);
	});
	return insertedEvents;
}

router.put('/events/:eventId', jsonApiToJson, authenticateFromHeaderField, function (req, res, next) {
	handlePut(req, res, next, eventsToJsonApi);
});

router.put('/events/ics/:eventId', icsToJson, authenticateFromHeaderField, function(req, res, next) {
	handlePut(req, res, next, eventsToIcsInJsonApi);
});

function handlePut(req, res, next, outputFormatter) {
	const eventId = req.params.eventId;
	const event = req.events[0];
	const scopeIds = event.scope_ids;
	const user = req.user;

	authorizeWithPotentialScopeIds(eventId, scopeIds, user, getEvents, getOriginalEvent, 'eventId')
		.then(() => doUpdates(event, eventId))
		.then(sendUpdateNotification)
		.then(outputFormatter)
		.then((jsonApi) => { returnSuccess(res, 200, jsonApi); })
		.catch(next);
}

function doUpdates(event, eventId) {
	return new Promise(function (resolve, reject) {
		updateEvents(event, eventId)
			.then((updatedEvents) => {
				if (updatedEvents.length === 0) {
					const error = new Error('Given eventId or scopeIds not found '
						+ 'for event modification');
					error.status = 404;
					error.title = 'Query Error';
					reject(error);
				} else {
					resolve(updatedEvents);
				}
			})
			.catch(reject);
	});
}

function sendUpdateNotification(updatedEvents) {
	updatedEvents.forEach((updatedEvent) => {
		const { scope_id, summary, dtstart, dtend } = updatedEvent;
		sendNotification.forModifiedEvent(scope_id, summary, dtstart, dtend);
	});
	return updatedEvents;
}

router.delete('/events/duplicates', isMigration, (req, res, next) => {
	deleteDuplicatedEvents()
		.then((result) => ({data: result}))
		.then((jsonApi) => { returnSuccess(res, 204, jsonApi); })
		.catch(next);
});
router.delete('/scopes/:scopeId', authenticateFromHeaderField, (req, res, next) => {
	const scopeId = req.params.scopeId;
	const user = req.user;

	authorizeAccessToScopeId(user, scopeId)
		.then(() => deleteAllEventsForScope(scopeId))
		.then((result) => ({data: result}))
		.then((jsonApi) => { returnSuccess(res, 204, jsonApi); })
		.catch(next);
});

const processDeletedEvents = (deletedEvents, res, next) => {
	if (deletedEvents.length > 0) {
		returnSuccess({data: deletedEvents}, 204);
	} else {
		const err = {
			message: 'Given eventId or scopeIds not found for event deletion',
			status: 404,
			title: 'Query Error',
		};
		next(err);
	}
}

router.delete('/events/:eventId', jsonApiToJson, authenticateFromHeaderField, function (req, res, next) {
	const eventId = req.params.eventId;
	const user = req.user;
	const scopeIds = user.scopes;

	authorizeWithPotentialScopeIds(eventId, scopeIds, user, getEvents, getOriginalEvent, 'eventId')
		.then(() => deleteEventWithScope(eventId, scopeIds))
		.then((deletedEvents) => {
			processDeletedEvents(deletedEvents, res, next);
		})
		.catch(next);
});

module.exports = router;

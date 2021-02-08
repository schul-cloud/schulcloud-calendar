const { deleteEvents } = require('../../queries/events/deleteEvents');

const validateScopes = (scopes) => {
	if (!scopes) {
		const err = {
			message: `ScopeId is missing.`,
			status: 400,
			title: 'Bad Request',
		}
		throw err;
	}
};

deleteEventWithScope = async (eventId, scopes) => {
	validateScopes(scopes);
	return deleteEvents(eventId, Object.keys(scopes));
}

module.exports = {
	deleteEventWithScope,
};

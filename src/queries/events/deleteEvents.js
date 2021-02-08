const db = require('../../infrastructure/databasePromise');
const { allColumns } = require('./constants');

async function deleteEvents(eventId, scopeIds) {
	const query = `DELETE FROM events WHERE event_id = $1 AND scope_id = ANY($2) RETURNING ${allColumns}`;
	const params = [eventId, scopeIds];

	return db.query(query, params);
}

async function deleteDuplicatesForCourses() {
	const query = `DELETE FROM events where id in (
		SELECT e.id from
		(
		-- events grouped by scope_id
		select scope_id, max("last-modified") as maxLastMod
		FROM events 
		WHERE x_fields ->> 'x-sc-courseId' is not null and repeat_wkst is not null
		GROUP BY scope_id) as t1
		-- return only events which were modified before max last modified date - 20 seconds
		JOIN events as e
			 ON t1.scope_id = e.scope_id and e."last-modified" < (t1.maxLastMod - '20 seconds'::interval)
	) RETURNING ${allColumns}`;
	return db.query(query);
}

async function deleteEventsForScope(scopeId) {
	const query = `DELETE FROM events WHERE scope_id = $1 RETURNING ${allColumns}`;
	const params = [scopeId];

	return db.query(query, params);
}

module.exports = {
	deleteEvents,
	deleteEventsForScope,
	deleteDuplicatesForCourses,
};

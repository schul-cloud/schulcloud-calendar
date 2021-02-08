const { deleteDuplicatesForCourses } = require('../../queries/events/deleteEvents');
const logger = require('../../infrastructure/logger');

duplicatesToString = (result) => {
    return result.map((d) => `${d.scope_id} => ${d.event_id}`).join(';');
}

deleteDuplicatedEvents = async () => {
    try {
        logger.alert(`Starting deleting duplicated events for courses`);
        const result = await deleteDuplicatesForCourses();
        const count = result.length;
        logger.alert(`Successfully deleted ${count} duplicated events for courses`);
        logger.alert(`Deleted duplicates: ${duplicatesToString(result)}`);
        return { count, data: result };
    } catch (e) {
        logger.alert(`Deleting of duplicated events failed: ${JSON.stringify(e)}`, e);
        throw e;
    }
}

module.exports = {
    deleteDuplicatedEvents
};

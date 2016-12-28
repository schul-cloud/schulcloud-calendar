const client = require('../models/database');
const errorMessage = require('./errorMessage');

function deleteEvent(params) {
    return new Promise(function(resolve, reject) {
        const query = 'DELETE FROM events WHERE reference_id = $1';
        client.query(query, params, function (error, result) {
            if (error) {
                errorMessage(query, error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

module.exports = deleteEvent;
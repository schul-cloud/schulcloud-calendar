const client = require('../models/database');
const errorMessage = require('./utils/errorMessage');

function insertFeedSubscription(params) {
    return new Promise(function(resolve, reject) {
        const query = 'INSERT INTO feeds (ics_url, description, reference_id) VALUES ($1, $2, $3) RETURNING id';
        client.query(query, params, function (error, result) {
            if (error) {
                errorMessage(query, error);
                reject(error);
            } else {
                resolve(result.rows[0].id);
            }
        });
    });
}

module.exports = insertFeedSubscription;
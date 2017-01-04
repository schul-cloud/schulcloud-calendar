const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

const icsToJson = require('../parsers/icsToJson');
const insertEventsWithReferenceIds = require('../queries/insertEventsWithReferenceIds');
const deleteEvent = require('../queries/deleteEvent');
const getAllUsersForUUID = require('../http_requests').getAllUsersForUUID;
const handleSuccess = require('./utils/handleSuccess')
const handleError = require('./utils/handleError')

router.post('/', function (req, res) {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
        console.error("Got invalid 'ids' array!");
        handleError(res);
        return;
    }
    const separateUsers = req.body.separateUsers;
    const ics = req.body.ics;
    const json = icsToJson(ics);
    if (!json) {
        handleError(res);
        return;
    }

    if (Array.isArray(json)) {
        json.forEach(function(event) {
            handleJson(event, separateUsers, ids, req, res);
        });
    } else {
        handleJson(json, separateUsers, ids, req, res);
    }

});

router.put('/:id', function (req, res) {
    // TODO implement
    var ids = req.body.ids;
    var separateUsers = req.body.separateUsers;
    var ics = req.body.ics;
    var id = req.params.id;
});

router.delete('/:id', function (req, res) {
    var id = req.params.id;
    Promise.resolve(deleteEvent([id])).then(
        handleSuccess.bind(null, res),
        handleError.bind(null, res)
    );
});

function handleJson(json, separateUsers, ids, req, res) {
    /*
     * json contains id, summary, location, description, start_timestamp,
     * end_timestamp, reference_id, created_timestamp, last_modified_timestamp
     */
    var params = [];
    var referenceIds;
    params[0] = json["summary"];            //$1: summary
    params[1] = json["location"];           //$2: location
    params[2] = json["description"];        //$3: description
    params[3] = json["start_timestamp"];    //$4: start_timestamp
    params[4] = json["end_timestamp"];      //$5: end_timestamp
    params[6] = new Date();                 //$7: created_timestamp

    if (separateUsers === true) {
        Promise.resolve(getAllUsersForUUID(ids[0])).then(
            insertSeparateEvents.bind(null, res),
            handleError.bind(null, res)
        );
    } else {
        referenceIds = [ids[0]];
        Promise.resolve(insertEventsWithReferenceIds(params, referenceIds)).then(
            handleSuccess.bind(null, res),
            handleError.bind(null, res)
        );
    }
}

function insertSeparateEvents(res, response) {
    const responseJson = JSON.parse(response);
    const result = responseJson.data;

    if(!Array.isArray(result)) {
        console.error("Got invalid server response (expected an array of ids)");
        return;
    }

    referenceIds = result.map(function(entry) {
        return entry.id;
    })

    Promise.resolve(insertEventsWithReferenceIds(params, referenceIds)).then(
        handleSuccess.bind(null, res),
        handleError.bind(null, res)
    );
}

module.exports = router;

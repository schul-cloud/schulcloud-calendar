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

// preprocessing
const authorize = require('../infrastructure/authorization');

// response
const returnError = require('../utils/response/returnError');
const returnSuccess = require('../utils/response/returnSuccess');
const returnIcs = require('../utils/response/returnIcs');

// content
const getScopesForToken = require('../services/getScopesForToken');
const scopesToCalendarList = require('../formatter/scopesToCalendarList');
const getScopeIdsForToken = require('../services/getScopeIdsForToken');
const getEvents = require('../services/getEvents');
const flatten = require('../utils/flatten');
const eventsToIcs = require('../formatter/eventsToIcs');

/* routes */

router.get('/calendar/list', authorize, function (req, res) {
    const token = req.get('Authorization');
    Promise.resolve(getScopesForToken(token))
        .then(scopesToCalendarList)
        .then((calendarList) => { returnSuccess(res, 200, calendarList); })
        .catch((error) => { returnError(res, error); });
});

router.get('/calendar', authorize, function (req, res) {
    const scopeId = req.get('scope-id');
    const token = req.get('Authorization');
    Promise.resolve(getScopeIdsForToken(token, scopeId))
        .then(getIcs)
        .then((icsString) => { returnIcs(res, icsString); })
        .catch((error) => { returnError(res, error); });
});

function getIcs(scopeIds) {
    return new Promise((resolve, reject) => {
        Promise.all(scopeIds.map((scopeId) => {
            const filter = { scopeId, all: true };
            return getEvents(filter);
        }))
            .then((events) => {
                resolve(eventsToIcs(flatten(events)));
            })
            .catch(reject);
    });
}

module.exports = router;

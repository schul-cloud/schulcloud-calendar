const getAllScopesForToken = require('../http/getAllScopesForToken');
const config = require('./../config');

function authenticateFromHeaderField(req, res, next) {
	const token = req.get('Authorization');
	getUser(req, res, next, token);
}

function authenticateFromQueryParameter(req, res, next) {
	const token = req.query['authorization'];
	getUser(req, res, next, token);
}

function isMigration(req, res, next) {
	if (config.IS_MIGRATION === true) {
		next();
	} else {
		const err = {
			message: 'This route is available only for migration!',
			status: 401,
			title: 'Unauthorized',
		};
		next(err);
	}
}

function getUser(req, res, next, token) {
	if (token) {
		req.token = token;
		getAllScopesForToken(token)
			.then((apiResponse) => {
				req.user = parseUserInformation(apiResponse);
				next();
			})
			.catch(() => {
				const err = {
					message: 'Invalid Authorization token!',
					status: 401,
					title: 'Unauthorized',
				};
				next(err);
			});
	} else {
		const err = {
			message: 'Missing Authorization token!',
			status: 401,
			title: 'Unauthorized',
		};
		next(err);
	}
}

function parseUserInformation(apiResponse) {
	apiResponse = JSON.parse(apiResponse);

	let user = {};
	user.scopes = {};
	apiResponse.data.forEach(function (scope) {
		if (scope.type === 'user') {
			user.id = scope.id;
			user.name = scope.attributes.name;
		}

		// These scopes also include the user ID
		user.scopes[scope.id] = {};
		user.scopes[scope.id].id = scope.id;
		user.scopes[scope.id].name = scope.attributes.name;
		user.scopes[scope.id].authorities = {};
		scope.attributes.authorities.forEach(function (authority) {
			user.scopes[scope.id].authorities[authority] = true;
		});
	});
	return user;
}

module.exports = {
	authenticateFromHeaderField,
	authenticateFromQueryParameter,
	isMigration,
};

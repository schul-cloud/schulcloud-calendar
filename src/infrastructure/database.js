const pg = require('pg');
const types = require('pg').types;
const INTERVAL_OID = 1186;
const config = require('../config');
const logger = require('../infrastructure/logger');

/*
pg-promise solve the issue with version 10.5.0
https://github.com/vitaly-t/pg-promise/issues/680
{
   message: 'Client has encountered a connection error and is not queryable',
   level: 'error',
   logType: 'error'
}
*/

logger.error('Client has encountered a connection error and is not queryable');

const PostGresErrorLog = (err) => {
	logger.error('[Database]', err);
}

const PostGresInfoLog = (info) => {
	logger.alert('[Database] '+info);
}

const UnexpectedConnectionErrorHandler = (err) => {
	PostGresErrorLog(err);
	process.exit(config.PROCESS_EXIT.DATABASE_FAIL);
}

const restart = (client, connect) => {
	try {
		client.end().then(() => {
			client = connect(db).catch(UnexpectedConnectionErrorHandler);
		})
	} catch (err) {
		UnexpectedConnectionErrorHandler(err);
	}
}


let client = null;
const connect = (db) => {
	const c = new pg.Client(db);

	return c.connect().then(() => {
		PostGresInfoLog('Postgres DB connected.');
		client = c;

		client.on('error', (err) => {
			PostGresErrorLog(err);
			if (typeof err === 'object' &&  err.severity === 'FATAL') {
					restart(client, connect);
			}
		});

		client.query("SET intervalstyle = 'iso_8601';");
		return client;
	}).catch(UnexpectedConnectionErrorHandler);
}

const resolveDBCredentials = () => {
	let db;
	if (config.NODE_ENV === 'production' || config.NODE_ENV === 'test') {
		const db_username = config.DB_USERNAME;
		const db_password = config.DB_PASSWORD;
		const db_host = config.DB_HOST;
		const db_port = config.DB_PORT;
		const db_database = config.DB_DATABASE;
	
		if (!db_username ||
			(config.NODE_ENV === 'production' && !db_password) ||
			!db_host ||
			!db_port ||
			!db_database) {
			throw new Error('expected database credentials but incomplete specified');
		}
	
		if (db_password) {
			db = {
				user: db_username,
				password: db_password,
				host: db_host,
				port: db_port,
				database: db_database,
			};
		} else {
			db = {
				user: db_username,
				host: db_host,
				port: db_port,
				database: db_database,
			};
		}
	} else {
		db = {
			user: 'node',
			password: 'node',
			host: 'localhost',
			port: 5432,
			database: 'schulcloud_calendar',
		};
	}
	return db;
}


const prom = connect(resolveDBCredentials());

// TODO link for explain this action
types.setTypeParser(INTERVAL_OID, function(val) {
	return val.toString();
});

// return a get client function getClient()
module.exports = (promise = false) => promise ? prom : client;

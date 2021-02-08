/**
 * Global Settings fot the Schul-Cloud Calendar Service
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
exports.NODE_ENV = NODE_ENV;
exports.REQUEST_LOGGING_ENABLED = process.env.REQUEST_LOGGING_ENABLED || NODE_ENV === 'development';

/**
 * Database settings for production environment
 */
exports.DB_HOST = process.env.DB_HOST;
exports.DB_DATABASE = process.env.DB_DATABASE;
exports.DB_USERNAME = process.env.DB_USERNAME;
exports.DB_PASSWORD = process.env.DB_PASSWORD;
exports.DB_PORT = process.env.DB_PORT || 5432;
exports.CONNECTION_POOL_SIZE = process.env.CONNECTION_POOL_SIZE || 10;
exports.DB_IDLE_TIMEOUT_MILLIS = process.env.DB_IDLE_TIMEOUT_MILLIS;
exports.DB_MAX_USES = process.env.DB_MAX_USES;

/**
 * Base Paths
 */
const SCHULCLOUD_BASE_PATH = process.env.SCHULCLOUD_BASE_PATH || 'http://localhost:3030';
const NOTIFICATION_SERVICE_BASE_PATH = process.env.NOTIFICATION_SERVICE_BASE_PATH || 'https://schul-cloud.org:3030';
exports.SCHULCLOUD_BASE_PATH = SCHULCLOUD_BASE_PATH;
exports.DOMAIN_NAME = process.env.DOMAIN_NAME || 'schul-cloud.org';
exports.ROOT_URL = process.env.ROOT_URL || `https://${exports.DOMAIN_NAME}:3000`;

/**
* API Paths
*/
exports.API_KEY = process.env.API_KEY || 'example';
const SERVER_USERS_URI = '/resolve/users/';
const SERVER_SCOPES_URI = '/resolve/scopes/';
exports.SERVER_USERS_URI = SERVER_USERS_URI;
exports.SERVER_SCOPES_URI = SERVER_SCOPES_URI;
exports.SCHULCLOUD_ALL_USERS_FOR_UUID = process.env.SCHULCLOUD_ALL_USERS_FOR_UUID || SCHULCLOUD_BASE_PATH + SERVER_USERS_URI;
exports.SCHULCLOUD_ALL_SCOPES_FOR_TOKEN = process.env.SCHULCLOUD_ALL_SCOPES_FOR_TOKEN || SCHULCLOUD_BASE_PATH + SERVER_SCOPES_URI;
exports.NOTIFICATION_SERVICE_NEW_NOTIFICATION = process.env.NOTIFICATION_SERVICE_NEW_NOTIFICATION || NOTIFICATION_SERVICE_BASE_PATH + '/messages';

/**
 * Notification Settings
 */
exports.NOTIFICATION_SERVICE_TOKEN = process.env.NOTIFICATION_SERVICE_TOKEN || 'service1';
exports.NOTIFICATION_SCHULCLOUD_ID = process.env.NOTIFICATION_SCHULCLOUD_ID || '1';

/**
 * CORS
 */
exports.CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://schulcloud.github.io';

/**
 * Logging
 */
exports.LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

/**
 * Setttings
 */
exports.DAY_IN_MS = 1000 * 60 * 60 * 24;
exports.SCOPE_DISPLAY_OLD_EVENTS_FROM_LAST_DAYS = 21;
exports.SCOPE_DISPLAY_OLD_EVENTS_UNTIL_DAYS = 365 * 2;

/**
 * Feature toggles
 */
exports.IS_MIGRATION = process.env.IS_MIGRATION === 'true' || NODE_ENV === 'test';

[![Build Status](https://travis-ci.org/schul-cloud/schulcloud-calendar.svg?branch=master)](https://travis-ci.org/schul-cloud/schulcloud-calendar) [![Greenkeeper badge](https://badges.greenkeeper.io/schul-cloud/schulcloud-calendar.svg)](https://greenkeeper.io/)

# schulcloud-calendar

[Calendar API](https://schul-cloud.github.io/schulcloud-calendar/#/default)

[Schul-Cloud API Requirements](https://github.com/schulcloud/schulcloud-calendar/blob/master/wiki/schulcloud-api-requirements.md)

[Research of Caldav Modules for Node](https://github.com/schulcloud/schulcloud-calendar/blob/master/wiki/node-caldav-research.md)

[Future work](https://github.com/schulcloud/schulcloud-calendar/blob/master/wiki/future-work.md)

## Setup
### Installation
PostgreSQL/bin/* folder must be accessable through shell/cmd (check environment variables) for this install guide to work. Check functionality with `psql --version` for example.
1. Clone repository
2. Install & start PostgreSQL, set and remember `postgres` user password during install
3. Create a user `node`, without password: `createuser -U postgres --superuser --login node`
4. Create a database named `schulcloud_calendar`: `createdb -U postgres schulcloud_calendar`
5. Connect to it: `psql -d schulcloud_calendar -U postgres`
   (Prompt will change to `schulcloud_calendar=#`)
6. Grant user with `all` permissions for the db: `grant all privileges on database schulcloud_calendar TO node;`
   (Feedback should be: `GRANT`)
7. Install [uuid-ossp](https://www.postgresql.org/docs/current/static/uuid-ossp.html) ([install info](https://www.postgresql.org/message-id/C5EBF511-835E-4F24-A4E4-6CC0119F48E4%40me.com)) extension: `CREATE EXTENSION "uuid-ossp";`
   Feedback should be: `CREATE EXTENSION`
8. Quit psql-Interpreter with Ctrl+C (or open new command prompt) and run `npm install`
9. Import DB data: view below
10. Run node:
   `npm start` for production environment
   `npm run start_local` for local unix environment
   `npm run start_local_win` for local windows environment

Alternative install instructions here: [Kalender Setup](https://docs.schul-cloud.org/display/SCDOK/Setup#Setup-Kalender)

### Example database data
If you get `fe_sendauth: no password supplied` errors on commands, edit your `[installdir]\data\pg_hba.conf` and set `METHOD` to `trust` in all lines.
1. Create tables with `psql -U node -d schulcloud_calendar -a -f schema.sql`
2. Insert example data using `psql -U node -d schulcloud_calendar -a -f example_data.sql`

### Tests
1. Create a database named `schulcloud_calendar_test` and setup as described above
2. Create tables with `psql -U node -d schulcloud_calendar_test -a -f schema.sql`
3. Run `npm test`

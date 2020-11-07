const app = require('./app');
const config = require('./config');
const http = require('http');

app.set('port', config.PORT);

const server = http.createServer(app);

server.listen(config.PORT);
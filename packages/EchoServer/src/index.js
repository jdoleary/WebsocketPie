const log = require('./log');
const { startServer } = require('./network');

const version = process.env.npm_package_version;
log(`Running Echo Server v${version}.`);
const port = process.env.PORT || 8080;
startServer({ port });

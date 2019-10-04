const log = require('./log');
const { startServer } = require('./network');

log(`Running Echo Server v${process.env.npm_package_version}.`);
const port = process.env.PORT || 8080;

startServer({ port });

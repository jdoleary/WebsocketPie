const { startServer } = require('./network');

const version = process.env.npm_package_version;
const port = process.env.PORT || 8080;
console.log(`Running Echo Server v${version} with port ${port}`);
startServer({ port });

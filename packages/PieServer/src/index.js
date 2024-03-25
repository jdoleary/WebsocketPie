const { startServer } = require('./network');

const port = process.env.PORT || 8080;
startServer({ port });

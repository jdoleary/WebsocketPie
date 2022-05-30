const pie = require('@websocketpie/server');
const hostApp = require('./SampleHostApp');
pie.startServer({ port: 8081, makeHostAppInstance: () => new hostApp() });
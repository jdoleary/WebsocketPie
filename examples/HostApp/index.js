const pie = require('../../packages/PieServer');
const hostApp = require('./SampleHostApp');
pie.startServer({ port: 8081, makeHostAppInstance: () => new hostApp() });
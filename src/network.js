const chalk = require('chalk');
const WebSocket = require('ws');
const log = require('./log');
const RoomManager = require('./RoomManager');

function startServer() {
  const port = process.env.PORT || 8080;
  const wss = new WebSocket.Server({ port });
  log(`Running Echo Server v${process.env.npm_package_version}.  Listening on *:${port}`);

  const rm = new RoomManager();

  wss.on('connection', client => {
    log(chalk.blue('a user connected'));
    client.on('message', data => {
      try {
        const msg = JSON.parse(data);
        switch (msg.type) {
          case 'joinRoom':
            rm.addClientToRoom(client, msg);
            break;
          case 'data':
            rm.onData(client, msg);
            break;
          default:
            log(chalk.yellow(`WARN: Message not understood: ${JSON.stringify(msg, null, 2)}`));
        }
      } catch (e) {
        console.error(e);
      }
    });
    client.on('close', () => {
      rm.onDisconnect(client);
    });
  });
}

module.exports = { startServer };

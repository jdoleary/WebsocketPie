const chalk = require('chalk');
const WebSocket = require('ws');
const log = require('./log');
const RoomManager = require('./RoomManager');

const roomManager = new RoomManager();

function startServer({ port }) {
  const webSocketServer = new WebSocket.Server({ port });
  webSocketServer.on('connection', client => {
    log(chalk.blue('A user connected'));
    client.on('message', data => {
      log(chalk.blue('A client sent a message'));
      try {
        const message = JSON.parse(data);
        switch (message.type) {
          case 'joinRoom':
            const { name, roomInfo } = message;
            roomManager.addClientToRoom({ client, name, roomInfo });
            break;
          case 'emitToRoom':
            roomManager.emitToClientRoom({ client, message });
            break;
          default:
            log(chalk.yellow(`WARN: Message not understood: ${JSON.stringify(message, null, 2)}`));
        }
      } catch (e) {
        console.error(e);
      }
    });
    client.on('close', () => {
      log(chalk.blue('A user disconnected'));
      roomManager.removeClientFromCurrentRoom(client);
    });
  });
  log(`Websocket server is listening on *:${port}`);
}

module.exports = { startServer };

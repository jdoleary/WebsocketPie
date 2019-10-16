const chalk = require('chalk');
const WebSocket = require('ws');
const log = require('./log');
const RoomManager = require('./RoomManager');
const uuidv4 = require('uuid/v4');

const roomManager = new RoomManager();

function startServer({ port }) {
  const webSocketServer = new WebSocket.Server({ port });
  webSocketServer.on('connection', client => {
    const clientId = uuidv4();
    client = Object.assign(client, { id: clientId });
    log(chalk.blue(`Client ${clientId} connected`));
    client.send(
      JSON.stringify({
        type: 'serverAssignedData',
        clientId,
      }),
    );
    client.on('message', data => {
      log(chalk.blue(`Client ${client.id} sent a message`));
      try {
        const message = JSON.parse(data);
        switch (message.type) {
          case 'joinRoom':
            roomManager.addClientToRoom({ client, roomInfo: message.roomInfo });
            break;
          case 'data':
            roomManager.echoToClientRoom({ client, message });
            break;
          case 'leaveRoom':
            roomManager.removeClientFromCurrentRoom(client);
            break;
          case 'getRooms':
            roomManager.getRooms({ client, roomInfo: message.roomInfo });
            break;
          default:
            log(chalk.yellow(`WARN: Message not understood: ${JSON.stringify(message, null, 2)}`));
        }
      } catch (e) {
        console.error(e);
      }
    });
    client.on('close', () => {
      log(chalk.blue(`Client ${client.id} disconnected`));
      roomManager.removeClientFromCurrentRoom(client);
    });
  });
  log(`Websocket server is listening on *:${port}`);
  return webSocketServer;
}

module.exports = { startServer };

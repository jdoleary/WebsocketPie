const chalk = require('chalk');
const WebSocket = require('ws');
const uuidv4 = require('uuid/v4');
const MessageType = require('./MessageType');
const log = require('./log');
const RoomManager = require('./RoomManager');

const roomManager = new RoomManager();

function startServer({ port }) {
  const webSocketServer = new WebSocket.Server({ port });
  webSocketServer.on('connection', client => {
    const clientId = uuidv4();
    client = Object.assign(client, { id: clientId });
    log(chalk.blue(`Client ${clientId} connected`));
    client.send(
      JSON.stringify({
        type: MessageType.ServerAssignedData,
        clientId,
      }),
    );
    client.on('message', data => {
      log(chalk.blue(`Client ${client.id} sent a message`));
      try {
        const message = JSON.parse(data);
        switch (message.type) {
          case MessageType.HostRoom:
            roomManager.hostRoom({ client, roomInfo: message.roomInfo });
            break;
          case MessageType.JoinRoom:
            roomManager.addClientToRoom({ client, roomInfo: message.roomInfo });
            break;
          case MessageType.Data:
            roomManager.echoToClientRoom({ client, message });
            break;
          case MessageType.LeaveRoom:
            roomManager.removeClientFromCurrentRoom(client);
            break;
          case MessageType.GetRooms:
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

const chalk = require('chalk');
const WebSocket = require('ws');
const uuidv4 = require('uuid/v4');
const { MessageType } = require('./enums');
const log = require('./log');
const RoomManager = require('./RoomManager');
const { version } = require('../package.json');
const { parseQueryString } = require('./util');

function heartbeat() {
  this.isAlive = true;
}

// makeHostApp: See examples/HostApp/readme.md for explanation about how hostApp works
function startServer({ port, heartbeatCheckMillis = 5000, makeHostAppInstance = null }) {
  const roomManager = new RoomManager(makeHostAppInstance);
  const webSocketServer = new WebSocket.Server({ port });
  webSocketServer.on('connection', (client, req) => {
    client.isAlive = true;
    client.on('pong', heartbeat);
    const queryString = parseQueryString(req.url);
    // Allow user to request a clientId when they join
    // This supports rejoining after a disconnect
    const clientId = queryString.clientId || uuidv4();
    client = Object.assign(client, { id: clientId });
    log(chalk.blue(`Client ${clientId} connected`));
    client.send(
      JSON.stringify({
        type: MessageType.ServerAssignedData,
        clientId,
        serverVersion: `v${version}`,
      }),
    );
    client.on('message', data => {
      log(chalk.blue(`Client ${client.id} sent a message`));
      try {
        const message = JSON.parse(data);
        switch (message.type) {
          case MessageType.JoinRoom: {
            const { makeRoomIfNonExistant, roomInfo } = message;
            if (makeRoomIfNonExistant) {
              roomManager.makeRoom(roomInfo);
            }
            roomManager
              .addClientToRoom({ client, roomInfo })
              .then(room => {
                resolveClientPromise(message.type, room.serialize());
              })
              .catch(err => {
                rejectClientPromise(message.type, err);
              });
            break;
          }
          case MessageType.Data:
            roomManager.onData({ client, message });
            break;
          case MessageType.LeaveRoom:
            roomManager.removeClientFromCurrentRoom(client);
            break;
          case MessageType.GetRooms:
            roomManager.getRooms({ client, roomInfo: message.roomInfo });
            break;
          default:
            throw new Error(`WARN: Message not understood: ${JSON.stringify(message, null, 2)}`);
        }
      } catch (err) {
        console.error('network.js | ', err);
        client.send(
          JSON.stringify({
            type: MessageType.Err,
            message: err.message,
          }),
        );
      }
    });
    client.on('close', () => {
      log(chalk.blue(`Client ${client.id} disconnected`));
      roomManager.removeClientFromCurrentRoom(client);
    });
    function resolveClientPromise(func, data) {
      client.send(
        JSON.stringify({
          type: MessageType.ResolvePromise,
          func,
          data,
        }),
      );
    }
    function rejectClientPromise(func, err) {
      client.send(
        JSON.stringify({
          type: MessageType.RejectPromise,
          func,
          err,
        }),
      );
    }
  });
  const heartbeatInterval = setInterval(function ping() {
    webSocketServer.clients.forEach(function each(client) {
      log('Send ping to clients');
      if (client.isAlive === false) return client.terminate();

      client.isAlive = false;
      client.ping();
    });
  }, heartbeatCheckMillis);

  webSocketServer.on('close', function close() {
    clearInterval(heartbeatInterval);
  });
  log(`Websocket server is listening on *:${port} and will check client heartbeat every ${heartbeatCheckMillis} milliseconds.`);
  return webSocketServer;
}

module.exports = { startServer };

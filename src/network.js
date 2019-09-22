const chalk = require('chalk');
const WebSocket = require('ws');
const uuidv4 = require('uuid/v4');
const log = require('./Log');
const RoomManager = require('./RoomManager');

function startServer() {
  const port = process.env.PORT || 8080;
  const wss = new WebSocket.Server({ port });
  log(`Running Echo Server v${process.env.npm_package_version}.  Listening on *:${port}`);

  // Map of ip -> uuid for all current AND previous connections
  // This allows a disconnected user to receive the same uuid if they rejoin
  const clientIpToUuidMap = {};
  const getClientUuid = (clientIp) => {
    if (!clientIpToUuidMap[clientIp]) {
      clientIpToUuidMap[clientIp] = uuidv4();
    }
    return clientIpToUuidMap[clientIp];
  };

  const roomManager = new RoomManager();

  wss.on('connection', (client, request) => {
    // Extract the client's ip.
    // If the request was proxied, use the value of that header for the ip instead.
    let clientIp = request.connection.remoteAddress;
    const xForwardedForHeader = request.headers['x-forwarded-for'];
    if (xForwardedForHeader) {
      clientIp = xForwardedForHeader.split(/\s*,\s*/)[0];
    }

    // Add metadata to client object.
    const clientUuid = getClientUuid(clientIp);
    client = Object.assign(client, { uuid: clientUuid });

    log(chalk.blue(`client ${clientUuid} connected`));

    // Inform the client of their server assigned data.
    client.send(JSON.stringify({
      type: 'serverAssignedData',
      clientUuid,
    }, null, 2));

    // Setup websocket event listeners.
    client.on('message', data => {
      try {
        const msg = JSON.parse(data);
        switch (msg.type) {
          case 'joinRoom':
            roomManager.addClientToRoom(client, msg.room);
            break;
          case 'data':
            const msgWithAdditionalData = {
              ...msg,
              clientUuid: client.uuid,
              time: Date.now(),
            };
            roomManager.onData(client, msgWithAdditionalData);
            break;
          default:
            log(chalk.yellow(`WARN: Message not understood: ${JSON.stringify(msg, null, 2)}`));
        }
      } catch (e) {
        log(chalk.red(e.message));
      }
    });

    client.on('close', () => {
      log(chalk.blue(`client ${clientUuid} disconnected`));
      roomManager.onDisconnect(client);
    });
  });
}

module.exports = { startServer };

const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');
const { MessageType } = require('./enums');
const log = require('./log');
const RoomManager = require('./RoomManager');
const { version } = require('../package.json');
const { parseQueryString } = require('./util');
let os;
try {
  // Optional dep
  os = require('os-utils');
} catch (e) { }


let roomManager;
let serverRunningSince = 0;
let areStatsAllowed = false;
function resolveClientPromise(client, func, data) {
  client.send(
    JSON.stringify({
      type: MessageType.ResolvePromise,
      func,
      data,
    }),
  );
}
function rejectClientPromise(client, func, err) {
  client.send(
    JSON.stringify({
      type: MessageType.RejectPromise,
      func,
      err,
    }),
  );
}
// makeHostApp: See examples/HostApp/readme.md for explanation about how hostApp works
function startServer({ port, makeHostAppInstance = null, allowStats = false }) {
  log(`Running @websocketpie/server-bun v${version} with port ${port}.  Stats allowed: ${allowStats}`);
  areStatsAllowed = allowStats;
  // Get the version of the host app so it can be sent to the client on connection
  const hostAppVersion = makeHostAppInstance ? makeHostAppInstance().version : undefined;
  roomManager = new RoomManager(makeHostAppInstance);
  const webSocketServer = Bun.serve({
    port,
    fetch(req, server){
      const queryString = parseQueryString(req.url);
      const success = server.upgrade(req, queryString ? {data:{clientId:queryString.clientId}}: undefined);
      if (success) {
        // Bun automatically returns a 101 Switching Protocols
        // if the upgrade succeeds
        return undefined;
      }
    },
    websocket: {
      async open(client){
        client.isAlive = true;
        // Allow user to request a clientId when they join
        // This supports rejoining after a disconnect
        const clientId = client.data && client.data.clientId ? client.data.clientId : uuidv4();
        client = Object.assign(client, { id: clientId });
        log(chalk.blue(`Client ${clientId} connected`));
        client.send(
          JSON.stringify({
            type: MessageType.ServerAssignedData,
            clientId,
            // The @websocketpie/server version
            serverVersion: version,
            // The version of the optional hostApp
            hostAppVersion: hostAppVersion
          }),
        );
      },
      async message(client, data){
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
                  resolveClientPromise(client, message.type, room.serialize());
                })
                .catch(err => {
                  rejectClientPromise(client, message.type, err);
                });
              break;
            }
            case MessageType.Data:
              roomManager.onData({ client, message });
              break;
            case MessageType.LeaveRoom:
              roomManager.removeClientFromRoom(client, client.room);
              break;
            case MessageType.GetRooms:
              roomManager.getRooms({ client, roomInfo: message.roomInfo });
              break;
            case MessageType.GetStats:
              getStats().then(stats => {
                client.send(
                  JSON.stringify({
                    type: MessageType.GetStats,
                    stats,
                  }),
                );
              }).catch(err => {
                console.error(err);
                client.send(
                  JSON.stringify({
                    type: MessageType.Err,
                    message: err.message,
                  }),
                );
              })
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
      },
      async close(client, code, message){
        log(chalk.blue(`Client ${client.id} disconnected; code ${code}; message ${message}`));
        roomManager.removeClientFromRoom(client, client.room);
      },
    },

  });
  log(`Websocket server is listening on *:${port}`);
  serverRunningSince = Date.now();
  webSocketServer.roomManager = roomManager;
  return webSocketServer;
}
async function getStats() {
  if (!areStatsAllowed) {
    return { err: 'Stats access not allowed.' }
  }
  if (roomManager) {
    const rooms = roomManager.rooms || [];
    const clients = rooms.reduce((count, room) => {
      count += room.clients.length;
      return count;
    }, 0)
    const uptime = Date.now() - serverRunningSince;

    const cpuUsage = await new Promise((resolve) => {
      if (os) {
        os.cpuUsage(resolve);
      } else {
        resolve(-1);
      }
    });

    const hiddenRoomsCount = rooms.filter(r => r.hidden).length;

    return {
      rooms: rooms
        // Filter out hidden rooms
        .filter(r => !r.hidden)
        .map(r => ({ app: r.app, name: r.name, version: r.version, isPasswordProtected: r.password !== undefined })),
      roomsHidden: hiddenRoomsCount,
      clients,
      uptime,
      cpuUsage
    }
  } else {
    return { err: 'roomManager not yet created.' }
  }

}


module.exports = { startServer };

const chalk = require('chalk');
const WebSocket = require('ws');
const uuidv4 = require('uuid/v4');
const log = require('./log');
const { findRoomGroup, findOrMakeRoom } = require('./rooms');
const { linkClientAndRoom, unlinkClientAndRoom } = require('./client_room');

function startServer({ port }) {
  const webSocketServer = new WebSocket.Server({ port });
  webSocketServer.on('connection', client => handleConnection({ client }));
  log(`Listening for websocket connections on *:${port}...`);
}

function handleConnection({ client }) {
  const {
    clientId,
  } = getServerAssignedData();
  client = Object.assign(client, { id: clientId });
  log(chalk.blue(`client ${clientId} connected`));
  const data = {
    clientId,
    type: 'serverAssignedData',
  };
  const jsonData = JSON.stringify(data);
  client.send(jsonData);
  client.on('message', message => handleClientMessage({ client, message }));
  client.on('close', () => handleClientClose({ client }));
}

function getServerAssignedData() {
  const clientId =  uuidv4();
  return {
    clientId,
  };
}

function handleClientMessage({ client, message }) {
  log(chalk.blue(`client ${client.id} sent message: ${message}`));
  try {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'getRooms':
        const { app, version } = data;
        handleGetRooms({ app, client, version });
      case 'joinRoom':
        const { room, roomClaims } = data;
        handleJoinRoom({ client, room, roomClaims });
        break;
      case 'data':
        handleData({ client, data });
        break;
      case 'leaveRoom':
        handleLeaveRoom({ client });
        break;
      default:
        log(chalk.yellow(`WARN: Message not understood: ${JSON.stringify(msg, null, 2)}`));
    }
  } catch (e) {
    log(chalk.red(e.message));
  }
}

function handleGetRooms({ app, client, version }) {
  const roomGroup = findRoomGroup({ app, version });
  const data = {
    app,
    rooms: roomGroup,
    type: 'rooms',
    version,
  };
  const jsonData = JSON.stringify(data);
  client.send(jsonData);
}

function handleJoinRoom({ client, room, roomClaims }) {
  handleLeaveRoom({ client });
  if (!room) {
    throw new Error('Cannot handle join room - no room specified');
  }
  const { app, name, version } = room;
  if (!(app && name && version)) {
    throw new Error(`Cannot add client to room - Missing room "name", "app", or "version"`);
  }
  log(chalk.blue(`adding client ${client.id} to room with app: ${room.app}, version: ${room.version}, and name: ${room.name}`));
  Object.assign(client, { roomClaims });
  const roomInstance = findOrMakeRoom({ app, version, name });
  linkClientAndRoom({ client, room: roomInstance });
  emit({
    data: {
      type: 'joinedRoom',
      clients: roomInstance.clients.map(c => ({
        id: c.id,
        roomClaims: c.roomClaims,
      })),
    },
    fromClient: client,
    toClients: roomInstance.clients,
  });
}

function handleData({ client, data }) {
  if (!client.room) {
    throw new Error('Cannot handle data - client is not a member of any room');
  }
  emit({
    data,
    fromClient: client,
    toClients: client.room.clients
  });
}

function handleLeaveRoom({ client }) {
  if (client.room) {
    const room = client.room;
    unlinkClientAndRoom({ client, room });
    emit({
      data: {
        type: 'leftRoom'
      },
      fromClient: client,
      toClients: room.clients,
    })
  }
}

function emit({ fromClient, toClients, data }) {
  const dataWithAdditionalInfo = {
    ...data,
    fromClientId: fromClient.id,
    time: Date.now(),
  }
  const jsonData = JSON.stringify(dataWithAdditionalInfo);
  toClients.forEach(client => client.send(jsonData));
}

function handleClientClose({ client }) {
  log(chalk.blue(`client ${client.id} disconnected`));
  handleLeaveRoom({ client });
}

module.exports = {
  startServer,
};
const chalk = require('chalk');
const log = require('./Log');
const Room = require('./Room');

class RoomManager {
  constructor() {
    this.rooms = {};
  }
  addClientToRoom(client, msg) {
    // name is client's handle, roomProps.name is room name
    const { name, roomProps } = msg;
    // Guard on required props
    if (!(name && roomProps.name && roomProps.app && roomProps.version)) {
      log(chalk.red(`Err: required arguments: name, roomProps.name in ${JSON.stringify(msg, null, 2)}`));
      return false;
    }

    log(chalk.blue(`${JSON.stringify(name)} addClientToRoom: ${roomProps.name}`));
    if (client && client.room && client.room.removeClient) {
      // If client is attempting to join a room but already belongs to a room,
      // remove client from previous room
      client.room.removeClient(client);
    }
    // Get existing room or host new room:
    const room = this.rooms[roomProps.name]
      ? this.rooms[roomProps.name]
      : (this.rooms[roomProps.name] = new Room(roomProps));
    // Add metadata to client object
    client = Object.assign(client, { name, room });
    return room.addClient(client, roomProps);
  }
  onData(client, msg) {
    if (!client || !client.room) {
      return;
    }
    const { room } = client;
    if (this.rooms[room.name]) {
      // Send the name of the client sending the data along with the data
      this.rooms[room.name].onData({
        type: 'data',
        fromClient: client.name,
        time: Date.now(),
        // The only information that carries over from clients message is the payload
        payload: msg.payload,
      });
    }
  }
  onDisconnect(client) {
    const room = client.room;
    // If client belongs to a room, leave room when connection closes
    if (room) {
      room.removeClient(client);
    }
  }
}

module.exports = RoomManager;

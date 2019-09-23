const chalk = require('chalk');
const log = require('./Log');
const Room = require('./Room');

class RoomManager {
  constructor() {
    this.rooms = {};
  }

  addClientToRoom(client, room) {
    if (!(room.name && room.app && room.version)) {
      throw new Error(`Err: missing required room values: name, app, or version in ${JSON.stringify(msg, null, 2)}`);
    }
    log(chalk.blue(`adding client ${client.uuid} to room ${room.name}`));
    // If client is attempting to join a room but already belongs to a room,
    // remove client from previous room
    if (client.room) {
      client.room.removeClient(client);
      delete client.room;
    }
    // Get existing room or host new room:
    if (!this.rooms[room.name]) {
      this.rooms[room.name] = new Room({
        name: room.name,
        app: room.app,
        version: room.version,
      });
    }
    let roomInstance = this.rooms[room.name];
    // Add metadata to client object
    client = Object.assign(client, { room: roomInstance });
    roomInstance.addClient(client);
  }

  onData(client, msg) {
    if (!client.room) {
      throw new Error('Err: cannot echo data from a client who is not a member of any room');
    }
    const room = this.rooms[client.room.name];
    if (!room) {
      throw new Error('Err: client room does not exist on the server');
    }
    room.onData(msg);
  }

  onDisconnect(client) {
    const { room } = client;
    if (room) {
      room.removeClient(client);
    }
  }
}

module.exports = RoomManager;

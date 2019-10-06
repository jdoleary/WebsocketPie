const chalk = require('chalk');
const log = require('./log');
const Room = require('./Room');

class RoomManager {
  constructor() {
    this.findOrMakeRoom = this.findOrMakeRoom.bind(this);
    this.addClientToRoom = this.addClientToRoom.bind(this);
    this.emitToClientRoom = this.emitToClientRoom.bind(this);
    this.removeClientFromCurrentRoom = this.removeClientFromCurrentRoom.bind(this);
    this.rooms = {};
  }

  findOrMakeRoom({ app, name, version }) {
    if (!(app && name && version)) {
      log(chalk.red(`ERR: Cannot find or make room, missing "app", "name" and/or "version"`));
      return;
    }
    const roomKey = `${app}-${version}-${name}`;
    if (!this.rooms[roomKey]) {
      this.rooms[roomKey] = new Room({ app, name, version });
    }
    return this.rooms[roomKey];
  }

  addClientToRoom({ client, name, roomInfo }) {
    if (!(client && name && roomInfo)) {
      log(chalk.red(`ERR: Cannot add client to room, missing "client", "name", and/or "roomInfo"`));
      return;
    }
    if (client.room) {
      this.removeClientFromCurrentRoom(client);
    }
    const room = this.findOrMakeRoom(roomInfo);
    if (!room) {
      log(chalk.red(`ERR: Cannot add client to room, unable to find or make room`));
      return;
    }
    log(chalk.blue(`Adding client to room`));
    client = Object.assign(client, { name, room });
    room.addClient(client);
  }

  emitToClientRoom({ client, message }) {
    if (!(client && client.room && message)) {
      log(chalk.red(`ERR: Cannot emit to room, missing "client", "client.room", or "message"`));
      return;
    }
    log(chalk.blue(`Emitting message to client room`));
    const { room } = client;
    room.emitMessageFromClient({
      client,
      message,
    });
  }

  removeClientFromCurrentRoom(client) {
    const { room } = client;
    if (!room) {
      return;
    }
    log(chalk.blue(`Removing client from room`));
    room.removeClient(client);
    // Remove data added while joining room.
    delete client.name;
    delete client.room;
  }
}

module.exports = RoomManager;

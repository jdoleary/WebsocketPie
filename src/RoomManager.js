const chalk = require('chalk');
const log = require('./log');
const Room = require('./Room');

class RoomManager {
  constructor() {
    this.rooms = [];
  }

  findOrMakeRoom({ app, name, version }) {
    if (!(app && name && version)) {
      log(chalk.red(`ERR: Cannot find or make room, missing "app", "name" and/or "version"`));
      return;
    }
    const existingRoom = this.rooms.find(room => room.app === app && room.name === name && room.version === version);
    if (existingRoom) {
      return existingRoom;
    }
    const newRoom = new Room({ app, name, version });
    this.rooms.push(newRoom);
    return newRoom;
  }

  addClientToRoom({ client, name, roomInfo }) {
    if (!(client && name && roomInfo)) {
      log(chalk.red(`ERR: Cannot add client to room, missing "client", "name", and/or "roomInfo"`));
      return false;
    }
    if (client.room) {
      this.removeClientFromCurrentRoom(client);
    }
    const room = this.findOrMakeRoom(roomInfo);
    if (!room) {
      log(chalk.red(`ERR: Cannot add client to room, unable to find or make room`));
      return false;
    }
    log(chalk.blue(`Adding client to room`));
    client = Object.assign(client, { name, room });
    room.addClient(client);
    return true;
  }

  echoToClientRoom({ client, message }) {
    if (!(client && client.room && message)) {
      log(chalk.red(`ERR: Cannot echo to room, missing "client", "client.room", or "message"`));
      return false;
    }
    log(chalk.blue(`Echoing message to client room`));
    const { room } = client;
    room.echoMessageFromClient({
      client,
      message,
    });
    return true;
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

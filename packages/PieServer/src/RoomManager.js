const chalk = require('chalk');
const log = require('./log');
const MessageType = require('./MessageType');
const Room = require('./Room');
const { fuzzyMatchRooms } = require('./util');

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

  addClientToRoom({ client, roomInfo }) {
    if (!(client && roomInfo)) {
      log(chalk.red(`ERR: Cannot add client to room, missing "client", and/or "roomInfo"`));
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
    log(
      chalk.blue(
        `Adding client ${client.id} to room: (app: ${room.app}, version: ${room.version}, name: ${room.name})`,
      ),
    );
    client = Object.assign(client, { room });
    room.addClient(client);
    return true;
  }

  echoToClientRoom({ client, message }) {
    if (!(client && client.room && message)) {
      log(chalk.red(`ERR: Cannot echo to room, missing "client", "client.room", or "message"`));
      return false;
    }
    log(chalk.blue(`Echoing message to client ${client.id} room`));
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
    log(chalk.blue(`Removing client ${client.id} from current room`));
    room.removeClient(client);
    // Remove data added while joining room.
    delete client.room;
  }

  getRooms({ client, roomInfo }) {
    client.send(
      JSON.stringify({
        type: MessageType.Rooms,
        rooms: fuzzyMatchRooms(this.rooms, roomInfo),
      }),
    );
  }
}

module.exports = RoomManager;

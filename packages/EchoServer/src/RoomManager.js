const chalk = require('chalk');
const log = require('./log');
const MessageType = require('./MessageType');
const Room = require('./Room');
const { fuzzyMatchRooms } = require('./util');

class RoomManager {
  constructor() {
    this.rooms = [];
  }

  getRoom({ app, name, version }) {
    if (!(app && name && version)) {
      return {
        err: `Cannot find or make room, missing some or all required args "app", "name" and/or "version" in getRoom({app:${app}, name:${name}, version:${version}})`,
      };
    }
    const existingRoom = this.rooms.find(room => room.app === app && room.name === name && room.version === version);
    if (existingRoom) {
      return { room: existingRoom };
    } else {
      return { room: null };
    }
  }
  MakeRoom({ client, roomInfo }) {
    const { room: preExistingRoom } = this.getRoom(roomInfo);
    if (preExistingRoom) {
      return { err: 'Cannot make new room, room already exists' };
    }
    // Make the room
    const newRoom = new Room(roomInfo);
    this.rooms.push(newRoom);
    // The host should implicitly join the room
    this.addClientToRoom({ client, roomInfo });
    return { room: newRoom };
  }

  addClientToRoom({ client, roomInfo }) {
    if (!(client && roomInfo)) {
      log(chalk.red(`ERR: Cannot add client to room, missing "client", and/or "roomInfo"`));
      return false;
    }
    if (client.room) {
      this.removeClientFromCurrentRoom(client);
    }
    const { room } = this.getRoom(roomInfo);
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

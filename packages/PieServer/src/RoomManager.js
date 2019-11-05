const chalk = require('chalk');
const log = require('./log');
const { MessageType, DataSubType } = require('./enums');
const Room = require('./Room');
const { fuzzyMatchRooms } = require('./util');

function addServerAssignedInfoToMessage({ client, message }) {
  return {
    ...message,
    fromClient: client.id,
    time: Date.now(),
  };
}
class RoomManager {
  constructor() {
    this.rooms = [];
  }

  getRoom({ app, name, version }) {
    if (!(app && name && version)) {
      throw new Error(
        `Cannot find or make room, missing some or all required args "app", "name" and/or "version" in getRoom({app:${app}, name:${name}, version:${version}})`,
      );
    }
    const existingRoom = this.rooms.find(room => room.app === app && room.name === name && room.version === version);
    if (existingRoom) {
      return existingRoom;
    }
  }
  makeRoom({ client, roomInfo }) {
    const preExistingRoom = this.getRoom(roomInfo);
    if (preExistingRoom) {
      throw new Error('Cannot make new room, room already exists');
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
      throw new Error('Cannot add client to room, missing "client", and/or "roomInfo"');
    }
    if (client.room) {
      this.removeClientFromCurrentRoom(client);
    }
    const room = this.getRoom(roomInfo);
    if (!room) {
      throw new Error(`Cannot add client to room, unable to find or make room`);
    }
    log(
      chalk.blue(
        `Adding client ${client.id} to room: (app: ${room.app}, version: ${room.version}, name: ${room.name})`,
      ),
    );
    client = Object.assign(client, { room });
    room.addClient(client);
  }

  onData({ client, message }) {
    if (!(client && client.room && message)) {
      throw new Error('Cannot echo to room, missing "client", "client.room", or "message"');
    }
    const { room } = client;
    const messageWithAdditionalData = addServerAssignedInfoToMessage({ client, message });
    switch (message.subType) {
      case DataSubType.Together:
        log(chalk.blue(`Queing together message`));
        room.queueTogetherMessage(messageWithAdditionalData);
        break;
      default:
        log(chalk.blue(`Echoing message to client ${client.id} room`));
        room.emit(messageWithAdditionalData);
        return true;
    }
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

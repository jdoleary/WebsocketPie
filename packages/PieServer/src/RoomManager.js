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
  constructor(makeHostAppInstance) {
    this.rooms = [];
    this.makeHostAppInstance = makeHostAppInstance;
  }

  getRoom({ app, name = 'default', version }) {
    if (!(app && version)) {
      throw new Error(
        `Cannot find or make room, missing some or all required args "app" and/or "version" in getRoom({app:${app}, name:${name}, version:${version}})`,
      );
    }
    const existingRoom = this.rooms.find(room => room.app === app && room.name === name && room.version === version);
    if (existingRoom) {
      return existingRoom;
    }
  }
  makeRoom(roomInfo) {
    const preExistingRoom = this.getRoom(roomInfo);
    if (preExistingRoom) {
      // Room already exists, cannot make new room
      // This intentionally does not return an error,
      // because clients may automatically try to create
      // a room before joining it to make sure it exists.
      // See network.js's client.on('message')...MessageType.JoinRoom
      return;
    }

    const hostApplicationInstance = this.makeHostAppInstance ? this.makeHostAppInstance() : undefined;
    // Make the room
    const newRoom = new Room(roomInfo, hostApplicationInstance);
    this.rooms.push(newRoom);
    return newRoom;
  }

  addClientToRoom({ client, roomInfo }) {
    if (!(client && roomInfo)) {
      return Promise.reject('Cannot add client to room, missing "client", and/or "roomInfo"');
    }
    if (client.room) {
      this.removeClientFromCurrentRoom(client);
    }
    const room = this.getRoom(roomInfo);
    if (!room) {
      return Promise.reject(`Cannot add client to room, unable to find the preexisting room`);
    }
    log(
      chalk.blue(
        `Adding client ${client.id} to room: (app: ${room.app}, version: ${room.version}, name: ${room.name})`,
      ),
    );
    client = Object.assign(client, { room });
    room.addClient(client);
    return Promise.resolve(room);
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
      case DataSubType.Whisper:
        log(chalk.blue(`Whispering to ${message.whisperClientIds}`));
        room.whisper(messageWithAdditionalData, message.whisperClientIds);
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

    // If room is empty, cleanup room:
    if (!room.clients.length) {
      const roomIndex = this.rooms.indexOf(room);
      this.rooms.splice(roomIndex, 1);
    }
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

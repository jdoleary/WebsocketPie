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
    // Cache the clients previous room,
    // then later in this function if the client successfully joins
    // the new room, remove the client from their old room
    const previousRoom = client.room;
    const room = this.getRoom(roomInfo);
    if (!room) {
      return Promise.reject(`Cannot add client to room, unable to find the preexisting room`);
    }
    if (room.cleanupTimeoutId !== undefined) {
      log(chalk.blue(`Cancelling clean up for room ${room.toString()} because a client has rejoined.`));
      clearTimeout(room.cleanupTimeoutId);
      room.cleanupTimeoutId = undefined;
    }
    log(
      chalk.blue(
        `Adding client ${client.id} to room: (app: ${room.app}, version: ${room.version}, name: ${room.name})`,
      ),
    );
    client = Object.assign(client, { room });
    try {
      room.addClient(client);
    } catch (e) {
      return Promise.reject(e.toString());
    }

    // Remove the client from their previous room if applicable
    if (previousRoom) {
      this.removeClientFromRoom(client, previousRoom);
    }

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

  removeClientFromRoom(client, room) {
    if (!room) {
      return;
    }
    log(chalk.blue(`Removing client ${client.id} from room ${room.toString()}`));
    room.removeClient(client);
    // Remove data added while joining room.
    delete client.room;

    // If room is empty, cleanup room:
    if (!room.clients.length) {
      // Wait to see if clients rejoin and if the do not, clean up the room.
      const rejoinGracePeriod = 1000 * 60 * 5;
      log(chalk.blue(`Clean: If no clients rejoin in ${rejoinGracePeriod} millis, will clean up room ${room.toString()}`));
      // Clear previous timeout if it exists
      if (room.cleanupTimeoutId !== undefined) {
        clearTimeout(room.cleanupTimeoutId);
      }
      room.cleanupTimeoutId = setTimeout(() => {
        log(chalk.blue(`Clean: Cleaning up room ${room.toString()}`));
        room.cleanup();
        const roomIndex = this.rooms.indexOf(room);
        this.rooms.splice(roomIndex, 1);
      }, rejoinGracePeriod);
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

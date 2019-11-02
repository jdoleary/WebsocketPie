const chalk = require('chalk');
const log = require('./log');
const MessageType = require('./MessageType');

class Room {
  constructor({ app, name, version }) {
    this.app = app;
    this.clients = [];
    this.name = name;
    this.version = version;
  }

  emit(data) {
    this.clients.forEach(c => c.send(JSON.stringify(data)));
  }

  echoMessageFromClient({ client, message }) {
    const messageWithAdditionalData = {
      ...message,
      fromClient: client.id,
      time: Date.now(),
    };
    this.emit(messageWithAdditionalData);
  }

  getClientIndex(client) {
    return this.clients.findIndex(c => c.id === client.id);
  }

  getClientsSafeToEmit() {
    return this.clients.map(c => c.id);
  }

  // For internal use only
  _clientPresenceChanged(client, present) {
    this.emit({
      clients: this.getClientsSafeToEmit(),
      clientThatChanged: client.id,
      time: Date.now(),
      type: MessageType.ClientPresenceChanged,
      present,
    });
  }

  addClient(client) {
    const clientIndex = this.getClientIndex(client);
    if (clientIndex !== -1) {
      log(chalk.yellow(`WARN: Cannot add client, client is already in the room.`));
      return;
    }
    this.clients.push(client);
    this._clientPresenceChanged(client, true);
  }

  removeClient(client) {
    const clientIndex = this.getClientIndex(client);
    if (clientIndex === -1) {
      log(chalk.yellow(`WARN: Cannot remove client, client is not in the room.`));
      return;
    }
    this.clients.splice(clientIndex, 1);
    this._clientPresenceChanged(client, false);
  }
}

module.exports = Room;

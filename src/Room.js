const chalk = require('chalk')
const log = require('./Log')
class Room {
  constructor({ name, app, version }) {
    this.name = name;
    // Room has a specific app name and version so only clients with the same
    // app/version can join the same room
    this.app = app;
    this.version = version;
    // ws Client objects in this room
    this.clients = [];
  }

  // Emit the event name and data to all clients in a Room
  emit(data) {
    log(chalk.blue(`Room | emit, ${JSON.stringify(data, null, 2)}`));
    log('clients', this.clients);
    this.clients.forEach(c => c.send(JSON.stringify(data)));
  }

  emitClientsInRoom() {
    this.emit({
      type: 'clientsInRoom',
      clients: this.clients.map(c => c.uuid),
      time: Date.now(),
    });
  }

  clientIsCurrentlyInRoom(client) {
    return this.clients.some(c => c.uuid === client.uuid);
  }

  addClient(client) {
    if (this.clientIsCurrentlyInRoom(client)) {
      return;
    }
    this.clients.push(client);
    this.emitClientsInRoom();
  }

  removeClient(client) {
    if (!this.clientIsCurrentlyInRoom(client)) {
      return;
    }
    const index = this.clients.indexOf(client);
    this.clients.splice(index, 1);
    this.emitClientsInRoom();
  }

  onData(data) {
    log(chalk.blue(`Room | onData ${JSON.stringify(data, null, 2)}`));
    this.emit(data);
  }
}

module.exports = Room
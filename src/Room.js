const chalk = require('chalk');
const log = require('./log');

class Room {
  constructor(properties) {
    // Room name
    this.name = properties.name;
    // Room has a specific app name and version so only clients with the same
    // app/version can join the same room
    this.app = properties.app;
    this.version = properties.version;
    // ws Client objects in this room
    this.clients = [];
  }
  // client is a ws client object
  addClient(client, roomProps) {
    if (!(this.name == roomProps.name && this.app == roomProps.app && this.version == roomProps.version)) {
      return false;
    }
    const preExistingClient = this.getClient(client.name);
    // Add a new client if client doesn't already exist
    if (!preExistingClient) {
      this.clients.push(client);
      // Send the names of the clients to all clients in this room
      this.emit({ type: 'client', clients: this.clients.map(c => c.name) });
      return true;
    }
  }
  removeClient(client) {
    const preExistingClient = this.getClient(client && client.name);
    if (preExistingClient) {
      const index = this.clients.indexOf(client);
      this.clients.splice(index, 1);
      // Send the names of the clients to all clients in this room
      this.emit({ type: 'client', clients: this.clients.map(c => c.name) });
      return true;
    } else {
      log(chalk.red(`Cannot remove client ${client && client.name}, client not found.`));
      return false;
    }
  }
  onData(data) {
    log(chalk.blue(`Room | onData ${JSON.stringify(data, null, 2)}`));
    this.emit(data);
  }

  // Emit the event name and data to all clients in a Room
  emit(data) {
    log(chalk.blue(`Room | emit, ${JSON.stringify(data, null, 2)}`));
    log('clients', this.clients);
    this.clients.forEach(c => c.send(JSON.stringify(data)));
  }

  getClient(name) {
    return this.clients.find(c => c && c.name === name);
  }
}

module.exports = Room;

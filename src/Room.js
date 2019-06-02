import chalk from 'chalk';

export default class Room {
  constructor(io, name) {
    this.io = io;
    // Room name
    this.name = name;
    // Clients in the room
    this.clients = [];
  }
  addClient(client) {
    console.log(chalk.blue(`Room | addClient ${JSON.stringify(client, null, 2)}`));
    const preExistingClient = this.getClient(client.name);
    // Add a new client if client doesn't already exist
    if (!preExistingClient) {
      this.clients.push(client);
    }
  }
  onData(data) {
    console.log(chalk.blue(`Room | onData ${JSON.stringify(data, null, 2)}`));
    this.emit('data', data)
  }

  // Emit the event name and data to all clients in a Room
  emit(eventName, data) {
    console.log(chalk.blue(`Room | emit ${eventName}, ${JSON.stringify(data, null, 2)}`));
    this.io.to(this.name).emit(eventName, data);
  }

  getClient(name) {
    return this.clients.find(c => c.name === name);
  }
}
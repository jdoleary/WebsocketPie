const chalk = require('chalk')
class Room {
  constructor(name) {
    // Room name
    this.name = name;
    // ws Client objects in this room
    this.clients = [];
  }
  // client is a ws client object
  addClient(client) {
    console.log(chalk.blue(`Room | addClient ${JSON.stringify(client, null, 2)}`));
    const preExistingClient = this.getClient(client._echoServer && client._echoServer.name);
    // Add a new client if client doesn't already exist
    if (!preExistingClient) {
      this.clients.push(client);
      // Send the names of the clients to all clients in this room
      this.emit({type:'client',clients:this.clients.map(c=>c.name)})
    }
  }
  removeClient(client) {
    console.log(chalk.blue(`Room | removeClient ${JSON.stringify(client, null, 2)}`));
    const preExistingClient = this.getClient(client._echoServer && client._echoServer.name);
    if (preExistingClient) {
      const index = this.clients.indexOf(client)
      this.clients.splice(index,1)
      // Send the names of the clients to all clients in this room
      this.emit({type:'client',clients:this.clients.map(c=>c.name)})
      return true
    } else {
      console.log(chalk.red(`Cannot remove client ${client._echoServer && client._echoServer.name}, client not found.`))
      return false
    }

  }
  onData(data) {
    console.log(chalk.blue(`Room | onData ${JSON.stringify(data, null, 2)}`));
    this.emit(data)
  }

  // Emit the event name and data to all clients in a Room
  emit(data) {
    console.log(chalk.blue(`Room | emit ${eventName}, ${JSON.stringify(data, null, 2)}`));
    this.clients.forEach(c => c.send(data))
  }

  getClient(name) {
    return this.clients.find(c => c._echoServer && c._echoServer.name === name);
  }
}

module.exports = Room
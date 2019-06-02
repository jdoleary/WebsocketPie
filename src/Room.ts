import { Client, SocketData } from './interfaces';
import socketio from 'socket.io';
import chalk from 'chalk';

export default class Room {
  name: string;
  io: socketio.Server
  clients: Client[];
  constructor(io: socketio.Server, name: string){
    this.io = io;
    this.name = name;
    this.clients = [];
  }
  public addClient(client: Client){
    console.log(chalk.blue(`Room | addClient: ${JSON.stringify(client, null, 2)}`));
    const preExistingClient = this.getClient(client.name);
    // Add a new client if client doesn't already exist
    if(!preExistingClient){
        this.clients.push(client);
    }
  }
  public onData(data:SocketData){
    console.log(chalk.blue(`Room | onData: ${JSON.stringify(data, null, 2)}`));
    this.emit('data', data)
  }

  // Emit the event name and data to all clients in a Room
  private emit(eventName:string, data:object){
    console.log(chalk.blue(`Room | emit: ${eventName}, ${JSON.stringify(data, null, 2)}`));
    this.io.to(this.name).emit(eventName, data);
  }
  
  private getClient(name: string): Client | undefined{
    return this.clients.find(c => c.name === name);
  }
}
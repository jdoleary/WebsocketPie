import { Client, SocketData } from './interfaces';
import socketio from 'socket.io';
import chalk from 'chalk';
import Game from './Game';

export default class Room {
  name: string;
  io: socketio.Server
  clients: Client[];
  game: Game;
  constructor(io: socketio.Server, name: string){
    this.io = io;
    this.name = name;
    this.clients = [];
    this.game = new Game(this.endGame.bind(this), this.emit.bind(this));
  }
  public addClient(client: Client){
    console.log(chalk.blue(`Room | addClient: ${JSON.stringify(client, null, 2)}`));
    const preExistingClient = this.getClient(client.name);
    // Add a new client if client doesn't already exist
    if(!preExistingClient){
        this.clients.push(client);
    }
  }
  public onReady(data:SocketData) {
    console.log(chalk.blue(`Room | onReady: ${JSON.stringify(data, null, 2)}`));
    const {action, playerName} = data;
    const client = this.getClient(playerName);
    if(!client){
      console.log(chalk.red(`ERR: client ${playerName} does not exist or action not ready`));
      return;
    }
    
    if(action === 'ready'){
      client.ready = true;
      // If all clients are ready, start the game
      const notReadyClients = this.clients.filter(c => !c.ready);
      if(notReadyClients.length === 0){
        console.log(chalk.green('Room | All players ready'));
        this.game.begin(this.clients.map(c => c.name));
      }else{
        console.log(chalk.green(`Room | Clients not yet ready: ${notReadyClients.map(c=>c.name)}`));

      }
    }
  }
  public onData(data:SocketData){
    console.log(chalk.blue(`Room | onData: ${JSON.stringify(data, null, 2)}`));
    this.game.onData(data);
  }

  private endGame(){
    // Reset clients:
    for(let i = 0; i < this.clients.length; i++){
        this.clients[i].ready = false;
    }
    this.emit('client-data', this.clients);
  }
  
  private emit(eventName:string, data:object){
    console.log(chalk.blue(`Room | emit: ${eventName}, ${JSON.stringify(data, null, 2)}`));
    this.io.to(this.name).emit(eventName, data);
  }
  
  private getClient(name: string): Client | undefined{
    return this.clients.find(c => c.name === name);
  }
}
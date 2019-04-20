
import chalk from 'chalk';
import express from 'express';
const app = express();
app.use(express.static('./Frontend/dist'));
const http = require('http').Server(app);
import socketio from 'socket.io';
const io = socketio(http);
import {GameState, SocketData, Client} from './interfaces';
import Room from './Room';

const rooms: {[roomName:string]:Room} = {};
function addClientToRoom(room:string, client:Client){
  const roomName = room.toLowerCase();
  if(roomName){
    rooms[roomName].addClient(client);
  }else{
    console.log(chalk.yellow(`WARN: room ${roomName} does not exist`));
  }
}

function sendFullGameState(room:string){
  console.log(chalk.blue('Set full gamestate for clients'));
  io.to(room).emit('data',rooms[room].game.state);
}
function sendClientData(room:string){
  io.to(room).emit('client-data',rooms[room].clients);
}

export function startServer() {
    io.on('connection', function(socket: any){
      console.log(chalk.blue('a user connected'));
      let room: string;
      socket.on('resetRoom', (msg:{roomToReset:string})=>{
        const {roomToReset} = msg;
        console.log(chalk.blue(`ROOM ${roomToReset} HAS BEEN RESET.`));
        rooms[roomToReset] = new Room(io, roomToReset);
      });
      socket.on('ADMIN-addClient', function (roomName:string, client:Client) {
        addClientToRoom(roomName,client);
        sendClientData(room);
      });
      socket.on('joinRoom', function (msg:{room:string, client:Client}) {
        const {client} = msg;
        if(room !== undefined){
          // if socket already has a room, leave it because it is trying to join a new room:
          console.log(chalk.blue(`${JSON.stringify(client)} leaveRoom ${room}`));
          socket.leave(room);
        }
        room = msg.room.toLowerCase();
        if(room){
          console.log(chalk.blue(`${JSON.stringify(client)} joinRoom: ${room}`));
          socket.join(room);
          if(!rooms[room]){
            // Host a new room:
            rooms[room] = new Room(io, room);
          }
          // WARN: Not typed, TODO add typeguard
          addClientToRoom(room,client);
    
          sendClientData(room);
          sendFullGameState(room);
        }else{
          console.log(chalk.red(`Err: joinRoom ${JSON.stringify(msg)}`));
        }
      });
      socket.on('force_game_state', (msg:{state:GameState}) => {
        console.log(chalk.magenta('force updated Room state'));
        const {BE_version} = rooms[room].game.state;
        if(BE_version !== msg.state.BE_version){
          console.log(chalk.yellow(`WARN, loading state saved from BE version ${msg.state.BE_version} while running ${BE_version}`));
        }
        rooms[room].game.state = msg.state;
        rooms[room].game.state.BE_version = BE_version;
        sendFullGameState(room);
      });
      socket.on('data', (data:SocketData) => {
        if(rooms[room]){
          rooms[room].onData(data);
          sendFullGameState(room);
        }
      });
      socket.on('ready', (data:SocketData) => {
        if(rooms[room]){
          rooms[room].onReady(data);
          sendFullGameState(room);
          sendClientData(room);
        }
      });
    });
    
    const PORT = process.env.PORT || 3000;
    http.listen(PORT, function(){
      console.log(`Running SuperMafia V ${process.env.npm_package_version}.  Listening on *:${PORT}`);
    });
}
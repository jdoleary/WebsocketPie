
import chalk from 'chalk';
import express from 'express';
const app = express();
app.use(express.static('./Frontend/dist'));
const http = require('http').Server(app);
import socketio from 'socket.io';
const io = socketio(http);
import {SocketData, Client} from './interfaces';
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

// Send info about current clients to all clients over socket
function sendClientData(room:string){
  io.to(room).emit('client-data',rooms[room].clients);
}

export function startServer() {
    io.on('disconnect', function(socket: any){
      // TODO
    });
    io.on('connection', function(socket: any){
      console.log(chalk.blue('a user connected'));
      let room: string;
      socket.on('resetRoom', (msg:{roomToReset:string})=>{
        const {roomToReset} = msg;
        console.log(chalk.blue(`ROOM ${roomToReset} HAS BEEN RESET.`));
        rooms[roomToReset] = new Room(io, roomToReset);
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
        }else{
          console.log(chalk.red(`Err: joinRoom ${JSON.stringify(msg)}`));
        }
      });
      socket.on('data', (data:SocketData) => {
        if(rooms[room]){
          rooms[room].onData(data);
        }
      });
    });
    
    const PORT = process.env.PORT || 3000;
    http.listen(PORT, function(){
      console.log(`Running Echo Server v${process.env.npm_package_version}.  Listening on *:${PORT}`);
    });
}
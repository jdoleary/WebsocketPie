
import chalk from 'chalk';
import express from 'express';
const app = express();
const http = require('http').Server(app);
import socketio from 'socket.io';
const io = socketio(http);
import Room from './Room';

const rooms = {};
// client is just be a string name, the actual network connection is managed in the socket
function addClientToRoom(room, clientName){
  const roomName = room.toLowerCase();
  if(roomName){
    rooms[roomName].addClient(clientName);
    return true
  }else{
    console.log(chalk.yellow(`WARN: room ${roomName} does not exist`));
    return false
  }
}

// Send info about current clients to all clients over socket
function sendClientData(room){
  io.to(room).emit('client-data',rooms[room].clients);
}

export function startServer() {
    io.on('disconnect', function(socket){
      // TODO
    });
    io.on('connection', function(socket){
      console.log(chalk.blue('a user connected'));
      let room;
      socket.on('resetRoom', (msg)=>{
        const {roomToReset} = msg;
        console.log(chalk.blue(`ROOM ${roomToReset} HAS BEEN RESET.`));
        rooms[roomToReset] = new Room(io, roomToReset);
      });
      socket.on('joinRoom', function (msg) {
        const {clientName} = msg;
        // Set name of the client on the socket object
        socket._echoServer = {clientName}
        if(room !== undefined){
          // if socket already has a room, leave it because it is trying to join a new room:
          console.log(chalk.blue(`${JSON.stringify(clientName)} leaveRoom ${room}`));
          socket.leave(room);
        }
        room = msg.room.toLowerCase();
        if(room){
          console.log(chalk.blue(`${JSON.stringify(clientName)} joinRoom: ${room}`));
          socket.join(room);
          if(!rooms[room]){
            // Host a new room:
            rooms[room] = new Room(io, room);
          }
          addClientToRoom(room,clientName);
          sendClientData(room);
        }else{
          console.log(chalk.red(`Err: joinRoom ${JSON.stringify(msg)}`));
        }
      });
      socket.on('data', (data) => {
        if(rooms[room]){
          // Send the name of the client sending the data along with the data
          data._echoServer.fromClient = socket._echoServer && socket._echoServer.clientName
          rooms[room].onData(data);
        }
      });
    });
    
    const PORT = process.env.PORT || 3000;
    http.listen(PORT, function(){
      console.log(`Running Echo Server v${process.env.npm_package_version}.  Listening on *:${PORT}`);
    });
}
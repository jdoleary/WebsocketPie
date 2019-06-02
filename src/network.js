const chalk = require('chalk')
const WebSocket = require('ws');
const Room = require('./Room')

const rooms = {};

function startServer() {
  const port = process.env.PORT || 8080;
  const wss = new WebSocket.Server({ port });
  console.log(`Running Echo Server v${process.env.npm_package_version}.  Listening on *:${port}`);

  wss.on('connection', client => {
    console.log(chalk.blue('a user connected'));
    client.on('message', msg => {
      switch (msg.type) {
        case 'joinRoom':
          joinRoom(client, msg)
          break
        case 'data':
          onData(client, msg)
          break
        default:
          console.log(chalk.yellow(`WARN: Message not understood: ${JSON.stringify(msg, null, 2)}`))
      }
    })
  })
}
function joinRoom(client, msg) {
  const { name, roomName } = msg;
  roomName = roomName.toLowerCase();
  if (!name || !roomName) {
    console.log(chalk.red(`Err: required arguments: name, roomName in ${JSON.stringify(msg, null, 2)}`))
    return
  }
  console.log(chalk.blue(`${JSON.stringify(name)} joinRoom: ${roomName}`));

  if (client._echoServer && client._echoServer.room) {
    // If client is attempting to join a room but already belongs to a room,
    // remove client from previous room
    room.removeClient(client)
  }
  // Get existing room or host new room:
  const room = rooms[roomName] || new Room(roomName)
  // Add metadata to client object
  client._echoServer = { name, roomName, room }
  room.addClient(client);

}
function onData(client, msg) {
  // TODO test for undefined error
  const { roomName } = client && client._echoServer
  if (rooms[roomName]) {
    // Send the name of the client sending the data along with the data
    msg._echoServer.fromClient = socket._echoServer && socket._echoServer.name
    rooms[roomName].onData(msg);
  }

}

module.exports = {startServer}
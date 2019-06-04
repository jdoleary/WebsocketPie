const chalk = require('chalk')
const WebSocket = require('ws');

const RoomManager = require('./RoomManager')
function startServer() {
  const port = process.env.PORT || 8080;
  const wss = new WebSocket.Server({ port });
  console.log(`Running Echo Server v${process.env.npm_package_version}.  Listening on *:${port}`);

  const rm = new RoomManager()

  wss.on('connection', client => {
    console.log(chalk.blue('a user connected'));
    client.on('message', msg => {
      switch (msg.type) {
        case 'joinRoom':
          rm.addClientToRoom(client, msg)
          break
        case 'data':
          rm.onData(client, msg)
          break
        default:
          console.log(chalk.yellow(`WARN: Message not understood: ${JSON.stringify(msg, null, 2)}`))
      }
    })
  })
}


module.exports = {startServer}
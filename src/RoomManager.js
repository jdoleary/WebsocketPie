const chalk = require('chalk')
const Room = require('./Room')


class RoomManager {
    constructor() {
        this.rooms = {}
    }
    addClientToRoom(client, msg) {
        // name is client's handle, roomProps.name is room name
        const { name, roomProps } = msg;
        // Guard on required props
        if(!(name && roomProps.name && roomProps.app && roomProps.version)){
            console.log(chalk.red(`Err: required arguments: name, roomProps.name in ${JSON.stringify(msg, null, 2)}`))
            return false
        }

        console.log(chalk.blue(`${JSON.stringify(name)} addClientToRoom: ${roomProps.name}`));
        if (client._echoServer && client._echoServer.room && client._echoServer.room.removeClient) {
            // If client is attempting to join a room but already belongs to a room,
            // remove client from previous room
            client._echoServer.room.removeClient(client)
        }
        // Get existing room or host new room:
        const room = this.rooms[roomProps.name] ? this.rooms[roomProps.name] : this.rooms[roomProps.name] = new Room(roomProps)
        // Add metadata to client object
        client._echoServer = { name, room }
        return room.addClient(client);

    }
    onData(client, msg) {
        // TODO test for undefined error
        const { room } = client && client._echoServer
        if (this.rooms[room.name]) {
            // Send the name of the client sending the data along with the data
            msg._echoServer.fromClient = socket._echoServer && socket._echoServer.name
            this.rooms[room.name].onData(msg);
        }

    }
}

module.exports = RoomManager
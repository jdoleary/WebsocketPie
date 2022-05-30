class SampleHostApp {
    // The host will receive all data that is send from a client
    // to the @websocketpie/server
    handleData(data) {
        console.log('SampleHostApp received: ', data)

        if (data.type == 'ClientPresenceChanged') {
            // HostApp has it's .sendData property set by @websocketpie/server
            // so that it can send messages to the clients through the
            // @websocketpie/server websocket connection to the clients
            if (this.sendData) {
                this.sendData('Please welcome the new client to the room');
            }

        }
    }
}
module.exports = SampleHostApp;
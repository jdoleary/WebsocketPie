const WebSocket = require('ws')
const test = require('tape')
const network = require('../network')
network.startServer()

class SimpleClient{
    constructor(userName, roomProps){

        this.messages = []
        
        const ws = new WebSocket('ws://localhost:8080');
        
        ws.on('open', () => {
            ws.send(JSON.stringify({
                type:'joinRoom',
                name: userName,
                roomProps
            }));
        });
        
        ws.on('message', (data) => {
            console.log('data', data)
            this.messages.push(data)
        });    
    }
}

test('IN PROGRESS', t => {
    const roomProps = {
        name: 'AlphaRoom',
        app: 'StealthEmUp',
        version: '2.3.1'
    }
    const billClient = new SimpleClient('Bill', roomProps)

})
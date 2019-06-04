const test = require('tape');
const RoomManager = require('../RoomManager')

const makeFakeWSClientObject = () => ({
    send:()=>{}
})

test('Host Room', function (t) {
    const rm = new RoomManager()
    const roomProps = {
        name: 'AlphaRoom',
        app: 'StealthEmUp',
        version: '2.3.1'
    }
    const didSucceed = rm.addClientToRoom(makeFakeWSClientObject(), { name: 'Bill', roomProps })

    t.equal(rm.rooms[roomProps.name].clients[0]._echoServer.name, 'Bill');
    t.equal(didSucceed, true)
    t.end()
});
test('Join Room', function (t) {
    const rm = new RoomManager()
    const roomProps = {
        name: 'AlphaRoom',
        app: 'StealthEmUp',
        version: '2.3.1'
    }
    // Host room
    rm.addClientToRoom(makeFakeWSClientObject(), { name: 'Bill', roomProps })
    // New client join room
    const didSucceed = rm.addClientToRoom(makeFakeWSClientObject(), { name: 'Beatrice', roomProps })

    t.equal(rm.rooms[roomProps.name].clients[1]._echoServer.name, 'Beatrice');
    t.equal(didSucceed, true)
    t.end()
});
test('Limit joining to 1 room at a time', function (t) {
    const rm = new RoomManager()
    const roomProps = {
        name: 'AlphaRoom',
        app: 'StealthEmUp',
        version: '2.3.1'
    }
    // Host room
    rm.addClientToRoom(makeFakeWSClientObject(), { name: 'Bill', roomProps })
    // New client join room
    const clientBeatrice = makeFakeWSClientObject()
    rm.addClientToRoom(clientBeatrice, { name: 'Beatrice', roomProps })

    const room2Props = {
        name: 'GammaRoom',
        app: 'StealthEmUp',
        version: '2.3.1'
    }
    // Client 2 change rooms
    rm.addClientToRoom(clientBeatrice, { name: 'Beatrice', roomProps: room2Props })

    t.equal(rm.rooms[roomProps.name].clients.length, 1);
    t.equal(rm.rooms[room2Props.name].clients[0]._echoServer.name, 'Beatrice');
    t.end()
});
test('Do not let client join room with differing roomProps', function (t) {
    const rm = new RoomManager()
    const roomProps = {
        name: 'AlphaRoom',
        app: 'StealthEmUp',
        version: '2.3.1'
    }
    // Host room
    rm.addClientToRoom(makeFakeWSClientObject(), { name: 'Bill', roomProps })

    const room2Props = {
        name: roomProps.name,
        app: roomProps.app,
        version: 'differentVersion'
    }
    // Client 2 join room with wrong version 
    const clientBeatrice = makeFakeWSClientObject()
    const actual = rm.addClientToRoom(clientBeatrice, { name: 'Beatrice', roomProps: room2Props })
    const expected = false

    t.equal(rm.rooms[roomProps.name].clients.length, 1);
    t.equal(actual, expected);
    t.end()
});
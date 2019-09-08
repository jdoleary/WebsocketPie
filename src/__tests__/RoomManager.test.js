const test = require('tape')
const RoomManager = require('../RoomManager')

const makeFakeWSClientObject = () => ({
    send: () => { }
})

test('Host Room', function (t) {
    const rm = new RoomManager()
    const roomProps = {
        name: 'AlphaRoom',
        app: 'StealthEmUp',
        version: '2.3.1'
    }
    const didSucceed = rm.addClientToRoom(makeFakeWSClientObject(), { name: 'Bill', roomProps })

    t.equal(rm.rooms[roomProps.name].clients[0].name, 'Bill');
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

    t.equal(rm.rooms[roomProps.name].clients[1].name, 'Beatrice');
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
    t.equal(rm.rooms[room2Props.name].clients[0].name, 'Beatrice');
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

// Test messaging with fake client
function FakeClient() {
    this.messages = []
    this.send = msg => this.messages.push(JSON.parse(msg))
}
test('Client in same room recieved message', t => {
    const rm = new RoomManager()
    const roomProps = {
        name: 'MessageRoom',
        app: 'Messagrrrrr',
        version: '1.0.0'
    }
    // Mock Date:
    const nowDate = (new Date(1234)).getTime()
    Date.now = () => nowDate
    // Host room
    const bill = new FakeClient()
    rm.addClientToRoom(bill, { name: 'Bill', roomProps })
    const beatrice = new FakeClient()
    rm.addClientToRoom(beatrice, { name: 'Beatrice', roomProps })
    const goku = new FakeClient()
    rm.addClientToRoom(goku, { name: 'Goku', roomProps: { name: 'otherRoom', app: 'DBZ', version: 'infinity' } })
    // Pretent beatrice sends message through socket which would send it to the room manager:
    const message = {
        type: 'data', // This is not tested here but would be used by network.js
        payload: {
            content: 'Five Finger Palm Heart Exploding Technique',
            damage: 9001,
        }
    }
    rm.onData(beatrice, message)
    t.deepEqual(bill.messages,
        [
            { type: 'client', clients: ['Bill'] },
            { type: 'client', clients: ['Bill', 'Beatrice'] },
            {
                type: 'data',
                fromClient: 'Beatrice',
                time: nowDate,
                payload: {
                    content: 'Five Finger Palm Heart Exploding Technique',
                    damage: 9001,

                }
            }
        ], 'Bill gets message from Beatrice')
    t.equal(goku.messages.length, 1, ' Assert that goku did not get the message because he is in a different room')
    t.equal(goku.messages[0].type, 'client', 'Only one message, that of Goku joining the room')
    t.end()

})
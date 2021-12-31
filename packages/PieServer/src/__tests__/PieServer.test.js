/* The objective of this file is to test whether
the PieServer's behavior matches the readme.
We do not care about implementation specifics.
What we care about is that FROM A CLIENT'S PERSPECTIVE,
the PieServer's API matches what's expected. */

const test = require('tape');
const WebSocket = require('ws');
const { MessageType, DataSubType } = require('../enums');
const { startServer } = require('../network');

const port = process.env.PORT || 8080;
const wsUrl = `ws://localhost:${port}`;
let webSocketServer;

function TestClient() {
  this.clearMessages = () => {
    this.messages.splice(0, this.messages.length);
  };
  this.connect = () => {
    return new Promise((resolve, reject) => {
      try {
        this.webSocket = new WebSocket(wsUrl);
        this.webSocket.on('message', data => {
          const message = JSON.parse(data);
          this.messages.push(message);
          if (this.resolveExpectedMessages) {
            this.numExpectedMessagesReceived += 1;
            if (this.numExpectedMessagesReceived >= this.numExpectedMessagesBeforeResolve) {
              this.resolveExpectedMessages();
              this.numExpectedMessagesBeforeResolve = 0;
              this.numExpectedMessagesReceived = 0;
              this.resolveExpectedMessages = undefined;
            }
          }
        });
        this.webSocket.on('open', () => {
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  };
  this.expectedMessagesReceived = undefined; /* can become a promise that tests can await */
  this.messages = [];
  this.numExpectedMessagesBeforeResolve = 0; /* used to resolve expectedMessagesReceived */
  this.numExpectedMessagesReceived = 0; /* used to resolve expectedMessagesReceived */
  this.resolveExpectedMessages = undefined; /* used to resolve expectedMessagesReceived */
  this.expectMessages = numMessages => {
    this.expectedMessagesReceived = new Promise(resolve => {
      this.resolveExpectedMessages = resolve;
    });
    this.numExpectedMessagesBeforeResolve = numMessages;
    this.numExpectedMessagesReceived = 0;
  };
  this.webSocket = undefined; /* set using connect() */
}

// General timeout for async tests
const timeout = 5000;

/* This method is less precise than using .expectMessages / .expectedMessagesReceived.
It is intended for circumstances where we want to validate a client DIDN'T receive a message. */
const wsTransmissionDelay = 100; // ms
function delay(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

/* Note: putting setup inside a test ensures a serial execution order. */
test('Setup', t => {
  webSocketServer = startServer({ port });
  t.end();
});

test('Connection', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;
  t.equal(client1.messages.length, 1, 'client1 should have received a message');
  t.equal(
    client1.messages[0].type,
    MessageType.ServerAssignedData,
    'client1 should have received a serverAssignedData message',
  );
  t.notEqual(client1.messages[0].clientId, undefined, 'client1 should received a clientId');
  t.end();
});

test('Clients joining a room', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;
  const client1Id = client1.messages[0].clientId;

  t.comment('client1 is hosting a room...');
  client1.clearMessages();
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
    makeRoomIfNonExistant: true,
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;
  t.equal(client1.messages.length, 2, 'client1 should receive a message');
  t.equal(client1.messages[0].type, MessageType.ClientPresenceChanged, 'client1 should receive a client message');
  t.equal(client1.messages[0].clientThatChanged, client1Id, 'client1 should see their id as the joining client');
  t.equal(client1.messages[0].present, true, 'client joined room, so present should be true');
  t.equal(
    client1.messages[1].type,
    MessageType.ResolvePromise,
    'client1 should receive notification that the promise is resolved',
  );
  t.equal(
    client1.messages[1].func,
    MessageType.JoinRoom,
    'The promise should be notifying that JoinRoom was successful',
  );
  t.equal(Array.isArray(client1.messages[0].clients), true, 'client1 should receive an array of clients');
  t.equal(client1.messages[0].clients.length, 1, 'client1 should know one client is in the room');
  t.equal(client1.messages[0].clients.includes(client1Id), true, 'client1 should see their id in the array of clients');

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;
  const client2Id = client2.messages[0].clientId;

  t.comment('client2 is joining a room...');
  client1.clearMessages();
  client2.clearMessages();
  client1.expectMessages(1);
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  client2.webSocket.send(jr2);

  await client1.expectedMessagesReceived;
  t.equal(client1.messages.length, 1, 'client1 should receive a message');
  t.equal(client1.messages[0].type, MessageType.ClientPresenceChanged, 'client1 should receive a client message');
  t.equal(client1.messages[0].clientThatChanged, client2Id, "client1 should see the joining client's id");
  t.equal(client1.messages[0].present, true, 'client1 should be present in room');
  t.equal(Array.isArray(client1.messages[0].clients), true, 'client1 should receive an array of clients');
  t.equal(client1.messages[0].clients.length, 2, 'client1 should know that two clients are in the room');
  t.equal(client1.messages[0].clients.includes(client1Id), true, 'client1 should see their id in the array of clients');
  t.equal(
    client1.messages[0].clients.includes(client2Id),
    true,
    "client1 should see client2's id in the array of clients",
  );

  await client2.expectedMessagesReceived;
  t.equal(client2.messages.length, 2, 'client2 should receive a message');
  t.equal(client2.messages[0].type, MessageType.ClientPresenceChanged, 'client2 should receive a client message');
  t.equal(client2.messages[0].clientThatChanged, client2Id, 'client2  should see their id as the joining client');
  t.equal(client2.messages[0].present, true, 'client2 should be present in room');
  t.equal(
    client2.messages[1].type,
    MessageType.ResolvePromise,
    'client2 should receive notification that the promise is resolved',
  );
  t.equal(
    client2.messages[1].func,
    MessageType.JoinRoom,
    'The promise should be notifying that JoinRoom was successful',
  );
  t.equal(Array.isArray(client2.messages[0].clients), true, 'client2 should receive an array of clients');
  t.equal(client2.messages[0].clients.length, 2, 'client2 should know that two clients are in the room');
  t.equal(
    client2.messages[0].clients.includes(client1Id),
    true,
    "client2 should see client1's id in the array of clients",
  );
  t.equal(client2.messages[0].clients.includes(client2Id), true, 'client1 should see their id in the array of clients');

  t.comment('test that clients 1 and 2 do not receive messages for other clients joining rooms they are not in...');
  client1.clearMessages();
  client2.clearMessages();

  t.comment('client3 is opening a connection...');
  const client3 = new TestClient();
  client3.expectMessages(1);
  await client3.connect();
  await client3.expectedMessagesReceived;

  t.comment('client3 is hosting a room with a different app...');
  client3.expectMessages(1);
  const jr3 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'DBGT',
      version: '1.0.0',
      name: 'Planet Namek',
    },
    makeRoomIfNonExistant: true,
  });
  client3.webSocket.send(jr3);
  await client3.expectedMessagesReceived;

  t.comment('client4 is opening a connection...');
  const client4 = new TestClient();
  client4.expectMessages(1);
  await client4.connect();
  await client4.expectedMessagesReceived;

  t.comment('client4 is hosting a room with a different version...');
  client4.expectMessages(1);
  const jr4 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'DBZ',
      version: '1.0.1',
      name: 'Earth',
    },
    makeRoomIfNonExistant: true,
  });
  client4.webSocket.send(jr4);
  await client4.expectedMessagesReceived;

  t.comment('client5 is opening a connection...');
  const client5 = new TestClient();
  client5.expectMessages(1);
  await client5.connect();
  await client5.expectedMessagesReceived;

  t.comment('client5 is hosting a room with a different name...');
  client5.expectMessages(1);
  const jr5 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Earth',
    },
    makeRoomIfNonExistant: true,
  });
  client5.webSocket.send(jr5);
  await client5.expectedMessagesReceived;

  t.comment('give clients 1 and 2 a moment to (not) receive messages...');
  await delay(wsTransmissionDelay);

  t.equal(client1.messages.length, 0, 'client1 should not have receive a message');
  t.equal(client2.messages.length, 0, 'client2 should not have receive a message');

  t.end();
});

test('Sending MessageType.JoinRoom will reject if the room does not exist', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
    // Note: makeRoomIfNonExistant defaults to false
    makeRoomIfNonExistant: false,
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;
  t.equal(
    client1.messages[1].type,
    MessageType.RejectPromise,
    'client1 should receive a RejectPromise message when trying to join a room that does not exist with makeRoomIfNonExistant set to false',
  );
  t.equal(client1.messages[1].func, MessageType.JoinRoom, 'The function of the rejected promise should be JoinRoom');
  t.end();
});

test('Sending messages within a room', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;
  const client1Id = client1.messages[0].clientId;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
    makeRoomIfNonExistant: true,
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('ws2 is joining a room...');
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;

  t.comment('client3 is opening a connection...');
  const client3 = new TestClient();
  client3.expectMessages(1);
  await client3.connect();
  await client3.expectedMessagesReceived;

  t.comment('client3 is hosting a room with a different app...');
  client3.expectMessages(1);
  const jr3 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'Ultimate Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
    makeRoomIfNonExistant: true,
  });
  client3.webSocket.send(jr3);
  await client3.expectedMessagesReceived;

  t.comment('client4 is opening a connection...');
  const client4 = new TestClient();
  client4.expectMessages(1);
  await client4.connect();
  await client4.expectedMessagesReceived;

  t.comment('client4 is hosting a room with a different version...');
  client4.expectMessages(1);
  const jr4 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.1',
      name: 'New York',
    },
    makeRoomIfNonExistant: true,
  });
  client4.webSocket.send(jr4);
  await client4.expectedMessagesReceived;

  t.comment('client5 is opening a connection...');
  const client5 = new TestClient();
  client5.expectMessages(1);
  await client5.connect();
  await client5.expectedMessagesReceived;

  t.comment('client5 is hosting a room with a different name...');
  client5.expectMessages(1);
  const jr5 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.0',
      name: 'Evil Lair',
    },
  });
  client5.webSocket.send(jr5);
  await client5.expectedMessagesReceived;

  t.comment('client1 is sending a message to their room...');
  client1.clearMessages();
  client2.clearMessages();
  client3.clearMessages();
  client4.clearMessages();
  client5.clearMessages();
  client1.expectMessages(1);
  client2.expectMessages(1);
  const payload = {
    test: 'value',
  };
  const d1 = JSON.stringify({
    type: MessageType.Data,
    payload,
  });
  client1.webSocket.send(d1);

  await client1.expectedMessagesReceived;
  t.equal(client1.messages[0].type, MessageType.Data, 'client1 should receive a data message');
  t.deepEqual(client1.messages[0].payload, payload, 'client1 should receive the right payload');
  t.equal(client1.messages[0].fromClient, client1Id, 'client1 should see who sent the message');
  t.notEqual(client1.messages[0].time, undefined, 'client1 should receive a timestamp');

  await client2.expectedMessagesReceived;
  t.equal(client2.messages[0].type, MessageType.Data, 'client2 should receive a data message');
  t.deepEqual(client2.messages[0].payload, payload, 'client2 should receive the right payload');
  t.equal(client2.messages[0].fromClient, client1Id, 'client2 should see who sent the message');
  t.notEqual(client2.messages[0].time, undefined, 'client2 should receive a timestamp');

  t.comment('give clients 3, 4, and 5 a moment to not receive the message...');
  await delay(wsTransmissionDelay);

  t.equal(client3.messages.length, 0, 'client3 should not receive a message');
  t.equal(client4.messages.length, 0, 'client4 should not receive a message');
  t.equal(client5.messages.length, 0, 'client5 should not receive a message');

  t.end();
});

test('Clients leaving a room', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    name: 'Naruto',
    roomInfo: {
      app: 'Ninja Clash',
      version: '1.0.0',
      name: 'Leaf Village',
    },
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;
  const client2Id = client2.messages[0].clientId;

  t.comment('client2 is joining a room...');
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    name: 'Sasuke',
    roomInfo: {
      app: 'Ninja Clash',
      version: '1.0.0',
      name: 'Leaf Village',
    },
  });
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;

  t.comment('client3 is opening a connection...');
  const client3 = new TestClient();
  client3.expectMessages(1);
  await client3.connect();
  await client3.expectedMessagesReceived;

  t.comment('client3 is Hosting a room with a different app...');
  client3.expectMessages(1);
  const jr3 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    name: 'Sakura',
    roomInfo: {
      app: 'Ninja Clash 2',
      version: '1.0.0',
      name: 'Leaf Village',
    },
  });
  client3.webSocket.send(jr3);
  await client3.expectedMessagesReceived;

  t.comment('client4 is opening a connection...');
  const client4 = new TestClient();
  client4.expectMessages(1);
  await client4.connect();
  await client4.expectedMessagesReceived;

  t.comment('client4 is hosting a room with a different version...');
  client4.expectMessages(1);
  const jr4 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    name: 'Kakashi',
    roomInfo: {
      app: 'Ninja Clash',
      version: '1.0.1',
      name: 'Leaf Village',
    },
  });
  client4.webSocket.send(jr4);
  await client4.expectedMessagesReceived;

  t.comment('client5 is opening a connection...');
  const client5 = new TestClient();
  client5.expectMessages(1);
  await client5.connect();
  await client5.expectedMessagesReceived;

  t.comment('client5 is hosting a room with a different name...');
  client5.expectMessages(1);
  const jr5 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    name: 'Orochimaru',
    roomInfo: {
      app: 'Ninja Clash',
      version: '1.0.0',
      name: 'Sound Village',
    },
  });
  client5.webSocket.send(jr5);
  await client5.expectedMessagesReceived;

  t.comment('test that clients do not get messages for clients leaving other rooms...');
  client1.clearMessages();
  client2.clearMessages();
  const lr = JSON.stringify({
    type: MessageType.LeaveRoom,
  });
  client3.webSocket.send(lr);
  client4.webSocket.send(lr);
  client5.webSocket.send(lr);

  t.comment('give clients 1 and 2 a moment to not receive messages...');
  await delay(wsTransmissionDelay);
  t.equal(client1.messages.length, 0, 'client1 should not have received a message');
  t.equal(client2.messages.length, 0, 'client2 should not have received a message');

  t.comment('test that clients receives a message for clients leaving the same room...');
  client1.expectMessages(1);
  client2.webSocket.send(lr);
  await client1.expectedMessagesReceived;

  t.equal(client1.messages.length, 1, 'client1 should receive a message');
  t.equal(client1.messages[0].type, MessageType.ClientPresenceChanged, 'client1 should receive a client message');
  t.equal(client1.messages[0].clientThatChanged, client2Id, 'client1 should see client2 as the client that left');
  t.equal(client1.messages[0].present, false, 'client1 is no longer present in the room');
  t.equal(Array.isArray(client1.messages[0].clients), true, 'client1 should receive an array of clients');
  t.equal(client1.messages[0].clients.length, 1, 'client1 should know one client is in the room');

  t.end();
});

test('getRooms should return an array of rooms with room info', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room');
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    name: 'Neo',
    roomInfo: {
      app: 'The Matrix',
      version: '1.0.0',
      name: 'The Subway',
    },
  });
  client1.expectMessages(1);
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('client2 is hosting a room');
  const realWorld1 = {
    app: 'The Real World',
    version: '1.0.0',
    name: 'The Nebuchadnezzar',
  };
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    name: 'Trinity',
    roomInfo: realWorld1,
  });
  client2.expectMessages(1);
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;

  t.comment('client3 is opening a connection...');
  const client3 = new TestClient();
  client3.expectMessages(1);
  await client3.connect();
  await client3.expectedMessagesReceived;

  t.comment('client3 is hosting a room');
  const realWorld2 = {
    app: 'The Real World',
    version: '1.0.1',
    name: 'The Nebuchadnezzar',
  };
  const jr3 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    name: 'Morpheus',
    roomInfo: realWorld2,
  });
  client3.expectMessages(1);
  client3.webSocket.send(jr3);
  await client3.expectedMessagesReceived;

  t.comment('Mr Smith is opening a connection...');
  const clientSmith = new TestClient();
  clientSmith.expectMessages(1);
  await clientSmith.connect();
  await clientSmith.expectedMessagesReceived;

  t.comment('clientSmith sends getRooms message');
  clientSmith.clearMessages();
  clientSmith.expectMessages(1);
  const gr1 = JSON.stringify({
    type: MessageType.GetRooms,
    roomInfo: {
      app: 'The Real World',
      version: '1.0',
    },
  });
  clientSmith.webSocket.send(gr1);
  await clientSmith.expectedMessagesReceived;
  t.equal(clientSmith.messages[0].type, MessageType.Rooms, 'clientSmith should receive a rooms message');
  t.deepEqual(
    clientSmith.messages[0],
    {
      type: MessageType.Rooms,
      rooms: [realWorld1, realWorld2],
    },
    "clientSmith should see only the rooms in  'The Real World' with a version string starting with 1.0",
  );

  t.comment('clientSmith sends getRooms message with specific version string');
  clientSmith.clearMessages();
  clientSmith.expectMessages(1);
  const gr2 = JSON.stringify({
    type: MessageType.GetRooms,
    // roomInfo in this MessageType.GetRooms is identical to realWorld1 so it will filter on each property
    roomInfo: realWorld1,
  });
  clientSmith.webSocket.send(gr2);
  await clientSmith.expectedMessagesReceived;
  t.equal(clientSmith.messages[0].type, MessageType.Rooms, 'clientSmith should receive a rooms message');
  t.deepEqual(
    clientSmith.messages[0],
    {
      type: MessageType.Rooms,
      rooms: [realWorld1],
    },
    "clientSmith should see only the one room in  'The Real World' that matches the name, app, and version",
  );
  t.end();
});

test('Room maxClients', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.clearMessages();
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: {
      app: 'TinyRoom',
      version: '1.0.0',
      name: 'Cupboard',
      maxClients: 1,
    },
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('client2 trys to join a room but should recieve an error due to maxClients...');
  client2.clearMessages();
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'TinyRoom',
      version: '1.0.0',
      name: 'Cupboard',
    },
  });
  client2.webSocket.send(jr2);

  await client2.expectedMessagesReceived;
  t.deepEqual(
    client2.messages[0],
    {
      type: MessageType.Err,
      message: `Room is at capacity and cannot accept more clients due to the room's chosen settings`,
    },
    'client2 should not be able to have joined the room due to capacity',
  );
  t.end();
});
test('Together messages send all at once', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: {
      app: 'SpidermanTogether',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('client2 is joining a room...');
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'SpidermanTogether',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;

  t.comment('client1 is sending a message to their room...');
  client1.clearMessages();
  client2.clearMessages();
  client1.expectMessages(1);
  client2.expectMessages(1);
  const d1 = JSON.stringify({
    type: MessageType.Data,
    subType: DataSubType.Together,
    togetherId: 1,
    payload: {
      test1: 'value1',
    },
  });
  client1.webSocket.send(d1);
  await delay(wsTransmissionDelay);

  t.equal(
    client2.messages.length,
    0,
    'client2 should not receive a message because the server is waiting to send them together',
  );

  const d2 = JSON.stringify({
    type: MessageType.Data,
    subType: DataSubType.Together,
    togetherId: 1,
    payload: {
      test2: 'value2',
    },
  });
  client2.webSocket.send(d2);

  await client1.expectedMessagesReceived;
  t.deepEqual(client1.messages[0].payload, { test1: 'value1' }, 'Now client1 should receive the message');
  t.deepEqual(client1.messages[1].payload, { test2: 'value2' }, 'Now client1 should receive the message');
  t.equal(
    client1.messages[0].time,
    client1.messages[1].time,
    'Since the messages were sent together the times should be the same.',
  );

  t.end();
});
test('Together messages can timeout and send without all users', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: {
      app: 'SpidermanTogether2',
      version: '1.0.0',
      name: 'New York',
      togetherTimeoutMs: 1,
    },
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('client2 is joining a room...');
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'SpidermanTogether2',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;

  t.comment('client1 is sending a message to their room...');
  client1.clearMessages();
  client1.expectMessages(1);
  const d1 = JSON.stringify({
    type: MessageType.Data,
    subType: DataSubType.Together,
    togetherId: 1,
    payload: {
      test1: 'value1',
    },
  });
  client1.webSocket.send(d1);
  await client1.expectedMessagesReceived;
  t.deepEqual(
    client1.messages[0].payload,
    { test1: 'value1' },
    'Expect together message to timeout and echo without waiting for client2',
  );
  t.end();
});
test('Whipsers should not be heard by clients not being whispered to', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: {
      app: 'WhisperRoom',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('client2 is joining a room...');
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'WhisperRoom',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;
  const client2Id = client2.messages[0].clientId;

  t.comment('client3 is opening a connection...');
  const client3 = new TestClient();
  client3.expectMessages(1);
  await client3.connect();
  await client3.expectedMessagesReceived;

  t.comment('client3 is joining a room...');
  client3.expectMessages(1);
  const jr3 = JSON.stringify({
    type: MessageType.JoinRoom,
    roomInfo: {
      app: 'WhisperRoom',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client3.webSocket.send(jr3);
  await client3.expectedMessagesReceived;

  t.comment('client1 is whispering a message to client2');
  client1.clearMessages();
  client2.clearMessages();
  client3.clearMessages();
  client2.expectMessages(1);
  const d1 = JSON.stringify({
    type: MessageType.Data,
    subType: DataSubType.Whisper,
    whisperClientIds: [client2Id],
    payload: {
      test1: 'whisper',
    },
  });
  client1.webSocket.send(d1);
  await client2.expectedMessagesReceived;
  t.deepEqual(client2.messages[0].payload, { test1: 'whisper' }, 'Expect client 2 to have recieved whisper');
  t.comment('give client 3 a moment to not receive whisper...');
  await delay(wsTransmissionDelay);
  t.equal(client3.messages.length, 0, 'client3 should not have received a message');
  t.end();
});
test('Rooms are cleaned up when all clients leave', { timeout }, async t => {
  // Close and reopen server to get rid of all rooms with clients still hanging out in them
  await webSocketServer.close();
  webSocketServer = startServer({ port });

  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const room1 = {
    app: 'Cleanup Room',
    version: '1.0.0',
    name: 'Bedroom',
  };
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: room1,
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('client2 is joining a room...');
  client2.expectMessages(1);
  const room2 = {
    app: 'Observer Room',
    version: '1.0.0',
    name: 'Observatory',
  };
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: room2,
  });
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;

  t.comment('client2 is getting the rooms');
  client1.clearMessages();
  client2.clearMessages();
  client2.expectMessages(1);
  const gr1 = JSON.stringify({
    type: MessageType.GetRooms,
    roomInfo: {},
  });
  client2.webSocket.send(gr1);
  await client2.expectedMessagesReceived;
  t.equal(client2.messages[0].type, MessageType.Rooms, 'client2 should receive a rooms message');
  t.deepEqual(
    client2.messages[0],
    {
      type: MessageType.Rooms,
      rooms: [room1, room2],
    },
    'client2 should see both rooms',
  );
  t.comment('client1 should leave their room, causing it to be cleaned up');
  const lr = JSON.stringify({
    type: MessageType.LeaveRoom,
  });
  client1.webSocket.send(lr);

  t.comment('client2 should see only their own room now');
  client2.clearMessages();
  client2.expectMessages(1);
  client2.webSocket.send(gr1);
  await client2.expectedMessagesReceived;
  t.equal(client2.messages[0].type, MessageType.Rooms, 'client2 should receive a rooms message');
  t.deepEqual(
    client2.messages[0],
    {
      type: MessageType.Rooms,
      rooms: [room2],
    },
    'client2 should see only their own room now',
  );

  t.end();
});
test('Hidden rooms do not show in the Rooms message', { timeout }, async t => {
  // Close and reopen server to get rid of all rooms with clients still hanging out in them
  await webSocketServer.close();
  webSocketServer = startServer({ port });
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;

  t.comment('client1 is hosting a room...');
  client1.expectMessages(1);
  const room1 = {
    app: 'Hidden Room',
    version: '1.0.0',
    name: 'Secret',
    hidden: true,
  };
  const jr1 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: room1,
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;

  t.comment('client2 is opening a connection...');
  const client2 = new TestClient();
  client2.expectMessages(1);
  await client2.connect();
  await client2.expectedMessagesReceived;

  t.comment('client2 is hosting a room...');
  client2.expectMessages(1);
  const room2 = {
    app: 'Observer Room',
    version: '1.0.0',
    name: 'Observatory',
  };
  const jr2 = JSON.stringify({
    type: MessageType.JoinRoom,
    makeRoomIfNonExistant: true,
    roomInfo: room2,
  });
  client2.webSocket.send(jr2);
  await client2.expectedMessagesReceived;

  t.comment('client2 is getting the rooms');
  client1.clearMessages();
  client2.clearMessages();
  client2.expectMessages(1);
  const gr1 = JSON.stringify({
    type: MessageType.GetRooms,
    roomInfo: {},
  });
  client2.webSocket.send(gr1);
  await client2.expectedMessagesReceived;
  t.equal(client2.messages[0].type, MessageType.Rooms, 'client2 should receive a rooms message');
  t.deepEqual(
    client2.messages[0],
    {
      type: MessageType.Rooms,
      rooms: [room2],
    },
    'client2 should ONLY see the non-hidden rooms',
  );
  t.end();
});
/* Note: putting teardown inside a test ensures a serial execution order. */
test('Teardown', t => {
  webSocketServer.close();
  t.end();
});

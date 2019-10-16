/* The objective of this file is to test whether
the echo server's behavior matches the readme.
We do not care about implementation specifics.
What we care about is that FROM A CLIENT'S PERSPECTIVE,
the echo server's API matches what's expected. */

const test = require('tape');
const { startServer } = require('../network');
const WebSocket = require('ws');

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
  t.equal(client1.messages[0].type, 'serverAssignedData', 'client1 should have received a serverAssignedData message');
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

  t.comment('client1 is joining a room...');
  client1.clearMessages();
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: 'joinRoom',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  client1.webSocket.send(jr1);
  await client1.expectedMessagesReceived;
  t.equal(client1.messages.length, 1, 'client1 should receive a message');
  t.equal(client1.messages[0].type, 'clientJoinedRoom', 'client1 should receive a client message');
  t.equal(client1.messages[0].clientThatJoined, client1Id, 'client1 should see their id as the joining client');
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
    type: 'joinRoom',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  client2.webSocket.send(jr2);

  await client1.expectedMessagesReceived;
  t.equal(client1.messages.length, 1, 'client1 should receive a message');
  t.equal(client1.messages[0].type, 'clientJoinedRoom', 'client1 should receive a client message');
  t.equal(client1.messages[0].clientThatJoined, client2Id, "client1 should see the joining client's id");
  t.equal(Array.isArray(client1.messages[0].clients), true, 'client1 should receive an array of clients');
  t.equal(client1.messages[0].clients.length, 2, 'client1 should know that two clients are in the room');
  t.equal(client1.messages[0].clients.includes(client1Id), true, 'client1 should see their id in the array of clients');
  t.equal(
    client1.messages[0].clients.includes(client2Id),
    true,
    "client1 should see client2's id in the array of clients",
  );

  await client2.expectedMessagesReceived;
  t.equal(client2.messages.length, 1, 'client2 should receive a message');
  t.equal(client2.messages[0].type, 'clientJoinedRoom', 'client2 should receive a client message');
  t.equal(client2.messages[0].clientThatJoined, client2Id, 'client12should see their id as the joining client');
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

  t.comment('client3 is joining a room with a different app...');
  client3.expectMessages(1);
  const jr3 = JSON.stringify({
    type: 'joinRoom',
    roomInfo: {
      app: 'DBGT',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  client3.webSocket.send(jr3);
  await client3.expectedMessagesReceived;

  t.comment('client4 is opening a connection...');
  const client4 = new TestClient();
  client4.expectMessages(1);
  await client4.connect();
  await client4.expectedMessagesReceived;

  t.comment('client4 is joining a room with a different version...');
  client4.expectMessages(1);
  const jr4 = JSON.stringify({
    type: 'joinRoom',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.1',
      name: 'Earth',
    },
  });
  client4.webSocket.send(jr4);
  await client4.expectedMessagesReceived;

  t.comment('client5 is opening a connection...');
  const client5 = new TestClient();
  client5.expectMessages(1);
  await client5.connect();
  await client5.expectedMessagesReceived;

  t.comment('client5 is joining a room with a different name...');
  client5.expectMessages(1);
  const jr5 = JSON.stringify({
    type: 'joinRoom',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Earth',
    },
  });
  client5.webSocket.send(jr5);
  await client5.expectedMessagesReceived;

  t.comment('give clients 1 and 2 a moment to (not) receive messages...');
  await delay(wsTransmissionDelay);

  t.equal(client1.messages.length, 0, 'client1 should not have receive a message');
  t.equal(client2.messages.length, 0, 'client2 should not have receive a message');

  t.end();
});

test('Sending messages within a room', { timeout }, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = new TestClient();
  client1.expectMessages(1);
  await client1.connect();
  await client1.expectedMessagesReceived;
  const client1Id = client1.messages[0].clientId;

  t.comment('client1 is joining a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: 'joinRoom',
    roomInfo: {
      app: 'Spiderman',
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

  t.comment('ws2 is joining a room...');
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: 'joinRoom',
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

  t.comment('client3 is joining a room with a different app...');
  client3.expectMessages(1);
  const jr3 = JSON.stringify({
    type: 'joinRoom',
    roomInfo: {
      app: 'Ultimate Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client3.webSocket.send(jr3);
  await client3.expectedMessagesReceived;

  t.comment('client4 is opening a connection...');
  const client4 = new TestClient();
  client4.expectMessages(1);
  await client4.connect();
  await client4.expectedMessagesReceived;

  t.comment('client4 is joining a room with a different version...');
  client4.expectMessages(1);
  const jr4 = JSON.stringify({
    type: 'joinRoom',
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.1',
      name: 'New York',
    },
  });
  client4.webSocket.send(jr4);
  await client4.expectedMessagesReceived;

  t.comment('client5 is opening a connection...');
  const client5 = new TestClient();
  client5.expectMessages(1);
  await client5.connect();
  await client5.expectedMessagesReceived;

  t.comment('client5 is joining a room with a different name...');
  client5.expectMessages(1);
  const jr5 = JSON.stringify({
    type: 'joinRoom',
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
    type: 'data',
    payload,
  });
  client1.webSocket.send(d1);

  await client1.expectedMessagesReceived;
  t.equal(client1.messages[0].type, 'data', 'client1 should receive a data message');
  t.deepEqual(client1.messages[0].payload, payload, 'client1 should receive the right payload');
  t.equal(client1.messages[0].fromClient, client1Id, 'client1 should see who sent the message');
  t.notEqual(client1.messages[0].time, undefined, 'client1 should receive a timestamp');

  await client2.expectedMessagesReceived;
  t.equal(client2.messages[0].type, 'data', 'client2 should receive a data message');
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

  t.comment('client1 is joining a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: 'joinRoom',
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
    type: 'joinRoom',
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

  t.comment('client3 is joining a room with a different app...');
  client3.expectMessages(1);
  const jr3 = JSON.stringify({
    type: 'joinRoom',
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

  t.comment('client4 is joining a room with a different version...');
  client4.expectMessages(1);
  const jr4 = JSON.stringify({
    type: 'joinRoom',
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

  t.comment('client5 is joining a room with a different name...');
  client5.expectMessages(1);
  const jr5 = JSON.stringify({
    type: 'joinRoom',
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
    type: 'leaveRoom',
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
  t.equal(client1.messages[0].type, 'clientLeftRoom', 'client1 should receive a client message');
  t.equal(client1.messages[0].clientThatLeft, client2Id, 'client1 should see client2 as the client that left');
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

  t.comment('client1 is making a room');
  const jr1 = JSON.stringify({
    type: 'joinRoom',
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

  t.comment('client2 is making a room');
  const realWorld1 = {
    app: 'The Real World',
    version: '1.0.0',
    name: 'The Nebuchadnezzar',
  };
  const jr2 = JSON.stringify({
    type: 'joinRoom',
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

  t.comment('client3 is making a room');
  const realWorld2 = {
    app: 'The Real World',
    version: '1.0.1',
    name: 'The Nebuchadnezzar',
  };
  const jr3 = JSON.stringify({
    type: 'joinRoom',
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
    type: 'getRooms',
    roomInfo: {
      app: 'The Real World',
      version: '1.0',
    },
  });
  clientSmith.webSocket.send(gr1);
  await clientSmith.expectedMessagesReceived;
  t.equal(clientSmith.messages[0].type, 'rooms', 'clientSmith should receive a rooms message');
  t.deepEqual(
    clientSmith.messages[0],
    {
      type: 'rooms',
      rooms: [realWorld1, realWorld2],
    },
    "clientSmith should see only the rooms in  'The Real World' with a version string starting with 1.0",
  );

  t.comment('clientSmith sends getRooms message with specific version string');
  clientSmith.clearMessages();
  clientSmith.expectMessages(1);
  const gr2 = JSON.stringify({
    type: 'getRooms',
    // roomInfo in this 'getRooms' is identical to realWorld1 so it will filter on each property
    roomInfo: realWorld1,
  });
  clientSmith.webSocket.send(gr2);
  await clientSmith.expectedMessagesReceived;
  t.equal(clientSmith.messages[0].type, 'rooms', 'clientSmith should receive a rooms message');
  t.deepEqual(
    clientSmith.messages[0],
    {
      type: 'rooms',
      rooms: [realWorld1],
    },
    "clientSmith should see only the one room in  'The Real World' that matches the name, app, and version",
  );
  t.end();
});

/* Note: putting teardown inside a test ensures a serial execution order. */
test('Teardown', t => {
  webSocketServer.close();
  t.end();
});

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

function TestClient(webSocket) {
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
  this.webSocket = webSocket;
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
}

function connectTestClient() {
  return new Promise((resolve, reject) => {
    try {
      const webSocket = new WebSocket(wsUrl);
      webSocket.on('open', () => {
        const testClient = new TestClient(webSocket);
        resolve(testClient);
      });
    } catch (e) {
      reject(e);
    }
  });
}

// General timeout for async tests
const timeout = 5000

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

test('Clients joining a room', {timeout}, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = await connectTestClient();

  t.comment('client1 is joining a room...');
  client1.expectMessages(1);
  const jr1 = JSON.stringify({
    type: 'joinRoom',
    name: 'Goku',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  client1.webSocket.send(jr1);

  await client1.expectedMessagesReceived;
  t.equal(client1.messages.length, 1, 'client1 should receive a message');
  t.equal(client1.messages[0].type, 'client', 'client1 should receive a client message');
  t.equal(Array.isArray(client1.messages[0].clients), true, 'client1 should receive an array of clients');
  t.equal(client1.messages[0].clients.length, 1, 'client1 should know one client is in the room');

  t.comment('client2 is opening a connection...');
  const client2 = await connectTestClient();

  t.comment('client2 is joining a room...');
  client1.expectMessages(1);
  client2.expectMessages(1);
  const jr2 = JSON.stringify({
    type: 'joinRoom',
    name: 'Vegeta',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  client2.webSocket.send(jr2);

  await client1.expectedMessagesReceived;
  t.equal(client1.messages.length, 2, 'client1 should receive a message');
  t.equal(client1.messages[1].type, 'client', 'client1 should receive a client message');
  t.equal(Array.isArray(client1.messages[1].clients), true, 'client1 should receive an array of clients');
  t.equal(client1.messages[1].clients.length, 2, 'client1 should know that two clients are in the room');

  await client2.expectedMessagesReceived;
  t.equal(client2.messages.length, 1, 'client2 should receive a message');
  t.equal(client2.messages[0].type, 'client', 'client2 should receive a client message');
  t.equal(Array.isArray(client2.messages[0].clients), true, 'client2 should receive an array of clients');
  t.equal(client2.messages[0].clients.length, 2, 'client2 should know that two clients are in the room');

  t.comment('test that clients 1 and 2 do not receive messages for other clients joining rooms they are not in...');

  t.comment('client3 is opening a connection...');
  const client3 = await connectTestClient();
  t.comment('client3 is joining a room with a different app...');
  const jr3 = JSON.stringify({
    type: 'joinRoom',
    name: 'Omega Shenron',
    roomInfo: {
      app: 'DBGT',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  client3.webSocket.send(jr3);

  t.comment('client4 is opening a connection...');
  const client4 = await connectTestClient();
  t.comment('client4 is joining a room with a different version...');
  const jr4 = JSON.stringify({
    type: 'joinRoom',
    name: 'Freeza',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.1',
      name: 'Earth',
    },
  });
  client4.webSocket.send(jr4);

  t.comment('client5 is opening a connection...');
  const client5 = await connectTestClient();
  t.comment('client5 is joining a room with a different name...');
  const jr5 = JSON.stringify({
    type: 'joinRoom',
    name: 'Krillin',
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Earth',
    },
  });
  client5.webSocket.send(jr5);

  t.comment('give clients 1 and 2 a moment to (not) receive messages...');
  await delay(wsTransmissionDelay);

  t.equal(client1.messages.length, 2, 'client1 should not have receive a message');
  t.equal(client2.messages.length, 1, 'client2 should not have receive a message');

  t.end();
});

test('Sending messages within a room', {timeout}, async t => {
  t.comment('client1 is opening a connection...');
  const client1 = await connectTestClient();

  t.comment('client1 is joining a room...');
  const jr1 = JSON.stringify({
    type: 'joinRoom',
    name: 'Peter Parker',
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client1.webSocket.send(jr1);

  t.comment('client2 is opening a connection...');
  const client2 = await connectTestClient();

  t.comment('ws2 is joining a room...');
  const jr2 = JSON.stringify({
    type: 'joinRoom',
    name: 'Gwen Stacy',
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client2.webSocket.send(jr2);

  t.comment('client3 is opening a connection...');
  const client3 = await connectTestClient();

  t.comment('client3 is joining a room with a different app...');
  const jr3 = JSON.stringify({
    type: 'joinRoom',
    name: 'Miles Morales',
    roomInfo: {
      app: 'Ultimate Spiderman',
      version: '1.0.0',
      name: 'New York',
    },
  });
  client3.webSocket.send(jr3);

  t.comment('client4 is opening a connection...');
  const client4 = await connectTestClient();

  t.comment('client4 is joining a room with a different version...');
  const jr4 = JSON.stringify({
    type: 'joinRoom',
    name: 'MJ',
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.1',
      name: 'New York',
    },
  });
  client4.webSocket.send(jr4);

  t.comment('client5 is opening a connection...');
  const client5 = await connectTestClient();

  t.comment('client5 is joining a room with a different name...');
  const jr5 = JSON.stringify({
    type: 'joinRoom',
    name: 'Green Goblin',
    roomInfo: {
      app: 'Spiderman',
      version: '1.0.0',
      name: 'Evil Lair',
    },
  });
  client5.webSocket.send(jr5);

  t.comment('give the clients a moment to connect...');
  await delay(wsTransmissionDelay);

  t.comment('client1 is sending a message to their room...');
  const payload = {
    test: 'value',
  };
  const d1 = JSON.stringify({
    type: 'data',
    payload,
  });
  client1.webSocket.send(d1);

  t.comment('give the clients a moment to receive (or not receive) the message...');
  await delay(wsTransmissionDelay);

  t.notEqual(client1.messages.find(m => m.type === 'data'), undefined, 'client1 should receive a message');
  t.notEqual(client2.messages.find(m => m.type === 'data'), undefined, 'client2 should receive a message');
  t.equal(client3.messages.find(m => m.type === 'data'), undefined, 'client3 should not receive a message');
  t.equal(client4.messages.find(m => m.type === 'data'), undefined, 'client4 should not receive a message');
  t.equal(client5.messages.find(m => m.type === 'data'), undefined, 'client5 should not receive a message');

  t.end();
});

/* TODO: after #8 is merged, add a test for what happens when clients leave rooms. */

/* Note: putting teardown inside a test ensures a serial execution order. */
test('Teardown', t => {
  webSocketServer.close();
  t.end();
});

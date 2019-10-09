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

/* Note: putting setup inside a test ensures a serial execution order. */
test('Setup', t => {
  webSocketServer = startServer({ port });
  t.end();
});

test('Clients joining a room', async t => {
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

  t.comment('ws2 is joining a room...');
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

  t.end();
});

/* Note: putting teardown inside a test ensures a serial execution order. */
test('Teardown', t => {
  webSocketServer.close();
  t.end();
});

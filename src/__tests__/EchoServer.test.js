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

function connectTestClient() {
  return new Promise((resolve, reject) => {
    try {
      const webSocket = new WebSocket(wsUrl);
      const messages = [];
      webSocket.on('message', data => {
        const message = JSON.parse(data);
        messages.push(message);
      });
      webSocket.on('open', () => {
        resolve({ messages, webSocket });
      });
    } catch (e) {
      reject(e);
    }
  });
}

/* This value gives the ws time to travel across the wire. */
const wsTransmissionDelay = 100; // ms
function wsDelay() {
  return new Promise(resolve => setTimeout(resolve, wsTransmissionDelay));
}

/* Note: putting setup inside a test ensures a serial execution order. */
test('Setup', t => {
  webSocketServer = startServer({ port });
  t.end();
});

test('Clients joining a room', async t => {
  t.comment('ws1 is opening a connection...');
  const { messages: m1, webSocket: ws1 } = await connectTestClient();
  t.comment('ws1 is joining a room...');
  const n1 = 'Goku';
  const jr1 = JSON.stringify({
    type: 'joinRoom',
    name: n1,
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  ws1.send(jr1);
  await wsDelay();
  t.equal(m1.length, 1, 'ws1 should receive a message');
  t.equal(m1[0].type, 'client', 'ws1 should receive a client message');
  t.equal(Array.isArray(m1[0].clients), true, 'ws1 should receive an array of clients');
  t.equal(m1[0].clients.length, 1, 'ws1 should see one client in the room');

  t.comment('ws2 is opening a connection...');
  const { messages: m2, webSocket: ws2 } = await connectTestClient();
  t.comment('ws2 is joining a room...');
  const n2 = 'Vegeta';
  const jr2 = JSON.stringify({
    type: 'joinRoom',
    name: n2,
    roomInfo: {
      app: 'DBZ',
      version: '1.0.0',
      name: 'Planet Namek',
    },
  });
  ws2.send(jr2);
  await wsDelay();

  t.equal(m1.length, 2, 'ws1 should receive a message');
  t.equal(m1[1].type, 'client', 'ws1 should receive a client message');
  t.equal(Array.isArray(m1[1].clients), true, 'ws1 should receive an array of clients');
  t.equal(m1[1].clients.length, 2, 'ws1 should know that two clients are in the room');

  t.equal(m2.length, 1, 'ws2 should receive a message');
  t.equal(m2[0].type, 'client', 'ws2 should receive a client message');
  t.equal(Array.isArray(m2[0].clients), true, 'ws2 should receive an array of clients');
  t.equal(m2[0].clients.length, 2, 'ws2 should know that two clients are in the room');

  t.end();
});

/* Note: putting teardown inside a test ensures a serial execution order. */
test('Teardown', t => {
  webSocketServer.close();
  t.end();
});

/*
Integration tests for the PieClient
*/

const test = require('tape');
const PieClient = require('../PieClient');
const { startServer } = require('../../../EchoServer/src/network');
const MessageType = require('../../../common/MessageType');

const port = process.env.PORT || 8080;
const wsUri = `ws://localhost:${port}`;
let webSocketServer;

// General timeout for async tests
const timeout = 5000;

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

/* Note: putting setup inside a test ensures a serial execution order. */
test('Setup', t => {
  webSocketServer = startServer({ port });
  t.end();
});

test('Connection', { timeout }, async t => {
  t.comment('Opening a connection...');
  const messages = [];
  let messagesRecieved = 0;
  // Promise will resolve only when number of expected messages have been received
  const expectMessages = 5;
  let resolveMessages;
  let resolveConnected;
  const connectedPromise = new Promise(res => {
    resolveConnected = res;
  });
  const allMessagesReceivedPromise = new Promise(res => {
    resolveMessages = res;
  });
  function receiveMessage(message) {
    messages.push(message);
    messagesRecieved++;
    if (messagesRecieved >= expectMessages) {
      resolveMessages();
    }
  }
  function onConnectInfo(message) {
    messages.push(message);
    messagesRecieved++;
    if (message.connected) {
      resolveConnected();
    }
  }
  const pieClient = new PieClient({
    wsUri,
    onData: receiveMessage,
    onRooms: receiveMessage,
    onClientPresenceChanged: receiveMessage,
    onServerAssignedData: receiveMessage,
    onConnectInfo: onConnectInfo,
    onError: err => {
      console.log('ERROR:', err);
    },
  });
  t.comment('Waiting for connection...');
  try {
    await connectedPromise;
  } catch (e) {
    console.error(e);
  }
  t.comment('Got connection');
  const roomInfo = {
    app: 'DBZ',
    version: '1.0.0',
    name: 'Planet Namek',
  };
  t.comment('Join Room');
  pieClient.joinRoom(roomInfo);

  t.comment('Get Rooms');
  pieClient.getRooms();

  t.comment('send arbitrary client payload');
  pieClient.sendData({ pie: 'is so good' });

  t.comment('Wait for all messages to be recieved');
  await allMessagesReceivedPromise;

  t.deepEqual(
    messages[0],
    { type: MessageType.ConnectInfo, connected: true, msg: 'Opened connection to ws://localhost:8080' },
    'Got connectInfo',
  );
  t.equal(messages[1].type, MessageType.ServerAssignedData, 'Got  serverAssignedData');
  const myUUID = messages[1].clientId;
  t.equal(messages[2].type, MessageType.ClientPresenceChanged, 'Client presence changed');
  t.equal(messages[2].present, true, 'Client joined room');
  t.equal(messages[2].clientThatChanged, myUUID, 'client  that changed is me');
  t.deepEqual(messages[3], {
    type: MessageType.Rooms,
    rooms: [roomInfo],
  });
  delete messages[4].time;
  t.deepEqual(
    messages[4],
    {
      type: MessageType.Data,
      payload: { pie: 'is so good' },
      fromClient: myUUID,
    },
    'Got data',
  );

  t.end();
});

/* Note: putting teardown inside a test ensures a serial execution order. */
test('Teardown', t => {
  webSocketServer.close();
  t.end();
});

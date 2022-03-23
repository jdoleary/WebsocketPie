# @websocketpie/client

A client for connecting to, sending and receiving messages from a @websocketpie/server instance.

This package is a client that abstracts @websocketpie/server's public API behind simple publicly exported methods.

## Getting started, simplest usage:

```js
import PieClient from 'pie-client';

const pie = new PieClient({
  env: 'development',
  wsUri: 'ws://localhost:8000',
  onData: console.log,
  onError: console.error,
  onServerAssignedData: console.log,
  onClientPresenceChanged: console.log,
  onRooms: rooms => console.log('rooms', rooms),
  onConnectInfo: ({ connected }) => console.log('Connected', connected),
});
```

```js
function onConnected() {
  // To make a room, once connected
  pie
    .makeRoom({
      app: 'Some app name',
      name: 'Rock Paper Sissors Unlimited Room!',
      version: '0.1',
      private: true,
    })
    .then(() => console.log('New room made!'))
    .catch(e => console.error('Could not make new room:', e));
}
```

```js
function onConnected() {
  // To join a room, once connected
  pie
    .joinRoom({
      app: 'Some app name',
      name: 'Rock Paper Sissors Unlimited Room!',
      version: 'v0.1',
    })
    .then(() => console.log('Join succeeded!'))
    .catch(e => console.error('Join failed:', e));
}
```

```js
// To send data to everyone in the room
pie.sendData({
  any: 'data',
});
```

## Extras

Add `<div id='websocketpie-connection-status'></div>` to the page to have @websocketpie/client automatically update it with the connection status

# Pie Client

A client for connecting to, sending and receiving messages from an PieServer instance.

This package is an PieServer client that abstracts PieServer's public API behind simple publicly exported methods.

## Getting started, simplest usage:

```js
// If you're developing locally you'll need to `npm link` first
// see readme.md in parent folder for more on that.
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
  // Note, pie must be a valid PieClient object
  pie.makeRoom({
    app: 'Some app name',
    name: 'Rock Paper Sissors Unlimited Room!',
    version: '0.1',
    private: true,
  });
}
```

```js
// To Join
pie.joinRoom({
  app: 'Some app name',
  name: 'Rock Paper Sissors Unlimited Room!',
  version: 'v0.1',
});
pie.sendData({
  any: 'data',
});
```

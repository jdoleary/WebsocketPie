![NPM: @websocketpie/client](https://img.shields.io/npm/v/@websocketpie/client?color=brightgreen)

A client for connecting to, sending and receiving messages from a @websocketpie/server instance.

This package is a client that abstracts @websocketpie/server's public API behind simple publicly exported methods.

## Getting started, simplest usage:

```js
import PieClient from '@websocketpie/client';

const pie = new PieClient();
pie.onData = x => console.log('onData:', x.payload);
await pie.connect('ws://localhost:8000');
await pie.makeRoom({
      app: 'Some app name',
      name: 'Rock Paper Sissors Unlimited Room!',
      version: '0.1',
      private: true,
    });
pie.sendData("hello world");
```

## Extras

Add `<div id='websocketpie-connection-status'></div>` to the page to have @websocketpie/client automatically update it with the connection status

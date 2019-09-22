# Echo Server

## Info

Echo Server is a client-agnostic web socket server, generally designed for turn-based multiplayer games.  It fascilitates lobbies/rooms for connecting players who are using a client of the same name and version.  Then messages are send from client to server, which echos the message to all other clients in the room.  In this way, the server doesn't care about the content of the game and can fascilitate any game (if latency allows).

## Files (abstract to specific)

- index.js
  - Starts the Echo server.
- Network.js
  - Handles socket specifics, parses JSON
- RoomManager.js
  - Holds rooms, handles adding clients to rooms, passes on data to room with metadata
- Room.js
  - A group of clients playing the same game

## API: from client to server

Data from one client, to be echoed to other client(s) in the same room

``` js
{
    type: 'data',
    payload: <client defined payload>
}
```

When a client tries to join a room

``` js
{
    type: 'joinRoom',
    room: {
        name: string, // room name
        app: string, // app name
        version: string, // app version
    },

}
```

## API: from server to client

Server Assigned Data: Info send to the user after they connect to the server. Useful for informing the client about who they are in the system.

```js
{
    type: 'serverAssignedData',
    clientUuid: 'f0d8368d-85e2-54fb-73c4-2d60374295e3'
}
```

Clients In Room: Info about all clients connected to a room. Useful for displaying the state of the room lobby for example.

```js
{
    type: 'clientsInRoom',
    clients: [
      'c1d8be08-b5ba-4547-a284-aeacedc7fdcc',
      '386e7b01-22e5-4394-91ae-50866cfef5c9',
      'f0d8368d-85e2-54fb-73c4-2d60374295e3',
    ]
}
```

Data : Data send from the server that is an echo of data that the server recieved from another client.  This is up to the client to implement

```js
{
    type: 'data',
    clientUuid: 'c1d8be08-b5ba-4547-a284-aeacedc7fdcc', // the client that sent the message
    time: 1567963601131, // millis since epoch
    payload: {
        // client defined
        // This is the magic of echo server that allows it to be client agnostic
    }
}
```

## Tasks

- Whisper messages
- Support for client uuids
- Client ordering for authority (if one user's client needs to make a decision)
- Investigate 2 users connecting for one page
- Implement Client leave room
- [Should support rejoining if player disconnect](https://github.com/websockets/ws#how-to-detect-and-close-broken-connections)

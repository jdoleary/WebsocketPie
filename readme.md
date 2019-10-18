# Echo Server

## Info

Echo Server is a client-agnostic web socket server, generally designed for turn-based multiplayer games. It fascilitates lobbies/rooms for connecting players who are using a client of the same name and version. Then messages are send from client to server, which echos the message to all other clients in the room. In this way, the server doesn't care about the content of the game and can fascilitate any game (if latency allows).

## Files (abstract to specific)

- index.js
  - Starts the Echo server.
- network.js
  - Handles socket specifics, parses JSON
- RoomManager.js
  - Holds rooms, handles adding clients to rooms, passes on data to room with metadata
- Room.js
  - A group of clients playing the same game

## API: from client to server

When a client tries to join a room

```js
{
  type: 'joinRoom',
  roomInfo: {
    name: string, // room name
    app: string, // app name
    version: string, // app version
  },
}
```

Data from one client, to be echoed to other client(s) in the same room

```js
{
  type: 'data',
  payload: <client defined payload>
}
```

When a client tries to leave a room

```js
{
  type: 'leaveRoom',
}
```

When a client wants information on rooms

```js
{
  type: 'getRooms',
  roomInfo: {
    // The exact name of the app
    app: 'THPS2X',
    // The exact name of the room
    name: 'Tag at school',
    // A SEMVER (preferably) version number or a substring of a version number.
    // Allows for fuzzy matching on Major and Minor versions
    version: '1.2.0'
  }
}
```

## API: from server to client

Server assigned data: Info sent to a client that just connected to the server.

```js
{
  type: 'serverAssignedData',
  clientId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
}
```

Client joined room: Info about a client that just joined a room, and all clients connected to a room.

```js
{
  type: 'clientJoinedRoom',
  clients: [
    '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
    '123e4567-e89b-12d3-a456-426655440000'
  ],
  clientThatJoined: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  time: 1567963601131, // millis since epoch
}
```

Client left room: Info about a client that just left a room, and all clients still connected to a room.

```js
{
  type: 'clientLeftRoom',
  clients: [
    '123e4567-e89b-12d3-a456-426655440000'
  ],
  clientThatLeft: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  time: 1567963601131, // millis since epoch
}
```

Data : Data send from the server that is an echo of data that the server recieved from another client. This is up to the client to implement

```js
{
  type: 'data',
  fromClient: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  time: 1567963601131, // millis since epoch
  payload: {
    // client defined
    // This is the magic of echo server that allows it to be client agnostic
  }
}
```

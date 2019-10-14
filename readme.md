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
  name: string, // The name of the user who sent the message
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

## API: from server to client

Client joined room: Info about a client that just joined a room, and all clients connected to a room.

```js
{
  type: 'clientJoinedRoom',
  clients: ['Neo', 'Trinity', 'Morpheus'],
  clientThatJoined: 'Neo',
  time: 1567963601131, // millis since epoch
}
```

Client left room: Info about a client that just left a room, and all clients still connected to a room.

```js
{
  type: 'clientLeftRoom',
  clients: ['Trinity', 'Morpheus'],
  clientThatLeft: 'Neo',
  time: 1567963601131, // millis since epoch
}
```

Data : Data send from the server that is an echo of data that the server recieved from another client. This is up to the client to implement

```js
{
  type: 'data',
  fromClient: 'Trinity',
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

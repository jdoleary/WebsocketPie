# Echo Server

## Info

Echo Server is a client-agnostic web socket server, generally designed for turn-based multiplayer games. It fascilitates lobbies/rooms for connecting players who are using a client of the same name and version. Then messages are send from client to server, which echos the message to all other clients in the room. In this way, the server doesn't care about the content of the game and can fascilitate any game (if latency allows).

## API: from client to server

When a client tries to join a room

```js
{
  type: MessageType.JoinRoom,
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
  type: MessageType.Data,
  payload: <client defined payload>
}
```

When a client tries to leave a room

```js
{
  type: MessageType.LeaveRoom,
}
```

When a client wants information on rooms

```js
{
  type: MessageType.GetRooms,
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
  type: MessageType.ServerAssignedData,
  clientId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
}
```

Client joined / left room: Info about a client that just joined a room, and all clients connected to a room.

```js
{
  type: MessageType.ClientPresenceChanged,
  clients: [
    '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
    '123e4567-e89b-12d3-a456-426655440000'
  ],
  clientThatChanged: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  // true if client joined room (is now present in room), false if client left room (is no longer present in room)
  present: true,
  // millis since epoch
  time: 1567963601131,
}
```

Data : Data send from the server that is an echo of data that the server recieved from another client. This is up to the client to implement

```js
{
  type: MessageType.Data,
  fromClient: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  time: 1567963601131, // millis since epoch
  payload: {
    // client defined
    // This is the magic of echo server that allows it to be client agnostic
  }
}
```

Rooms: A filtered list of rooms on the server.

```js
{
  type: MessageType.Rooms,
  rooms: []
}
```

## Developing with an unpublished pie-client

1. Navigate to packages/PieClient and run `npm link`
2. Navigate to your client application and run `npm link pie-client`

```
jdo@DESKTOP-OFKI8CH MINGW64 ~/git/echo-server/packages/PieClient
$ npm link
added 155 packages from 96 contributors and audited 247 packages in 16.358s
found 0 vulnerabilities

C:\Users\jdo\AppData\Roaming\npm\node_modules\pie-client -> C:\Users\jdo\git\echo-server\packages\PieClient

jdo@DESKTOP-OFKI8CH MINGW64 ~/git/what-bus-driver
$ npm link pie-client
C:\Users\jdo\git\what-bus-driver\node_modules\pie-client -> C:\Users\jdo\AppData\Roaming\npm\node_modules\pie-client -> C:\Users\jdo\git -> C:\Users\jdo\git\echo-server\packages\PieClient

```

## Dev Ops

### Push Image to ECR

This is set up with AWS Codebuild. Go to codebuild and manually `Start build`

### Deploy Image on ECS

TBD

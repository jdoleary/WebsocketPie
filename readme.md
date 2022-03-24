![Websocket Pie Logo](logo.png)
![PieServer Docker Image](https://img.shields.io/docker/v/jdoleary1991/websocket-pie?label=Docker&color=brightgreen)
![NPM: @websocketpie/server](https://img.shields.io/npm/v/@websocketpie/server?color=brightgreen&label=npm%3A%20%40websocketpie%2Fserver)
![NPM: @websocketpie/client](https://img.shields.io/npm/v/@websocketpie/client?color=brightgreen&label=npm%3A%20%40websocketpie%2Fclient)

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue-ghost.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/jdoleary/WebsocketPie/tree/master)

WebsocketPie allows you to make realtime, multi-user applications without writing any server-side code.  Simply, connect clients to a @websocketpie/server instance and the server will act as a hub that echos messages it receives to all connected clients.


@websocketpie/server is a client-agnostic web socket server. It fascilitates lobbies/rooms for connecting players who are using a client of the same name and version. When messages are sent from client (a browser) to server, it echos the message to all other clients in the room. In this way, the server doesn't care about the content of the message and can fascilitate multiple unique experiences simultaneously.

@websocketpie/client provides simple functions for consuming the @websocketpie/server's api to let you hit the ground running!

## API: from client to server

When a client tries to host a room

```js
{
  type: MessageType.JoinRoom,
  makeRoomIfNonExistant: true, // This is necessary in order to create a new room, without it, if the room does not exist, the client will get an error message (which may be desirable) so that they do not accidentally create a 2nd, new room while trying to join a friend's room with a typo in it for example.
  roomInfo:
    name: string, // room name
    app: string, // app name
    version: string, // app version
    maxClients: number, // max clients allowed in room
    togetherTimeoutMs: number, // number of milliseconds when a group of together messages echos without waiting for the remainder of the clients to send a together message
    hidden: boolean, // if a room should be visible to anyone who queries the rooms
  },
}
```

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
  subType: DataSubtype.Together,
  togetherId: <anything indexable by an object>,  // optional
  whisperClientIds: [client ids], // optional
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
    // This is the magic of PieServer that allows it to be client agnostic
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

Err: The server notifying the client of an error

```js
{
  type: MessageType.Err,
  message: string
}
```

## Special Messages

**Together**
A together message waits for all clients in the room (unless it times out)
to send a message and then sends them all at once

## Developing with an unpublished pie-client

1. Navigate to packages/PieClient and run `npm run update-link`
2. Navigate to your client application and run `npm link pie-client`

```

me@DESKTOP ~/git/WebsocketPie/packages/PieClient
\$ npm run update-link

up to date, audited 3 packages in 766ms

found 0 vulnerabilities


C:\Users\me\AppData\Roaming\npm\node_modules\pie-client -> C:\Users\me\git\WebsocketPie\packages\PieClient

me@DESKTOP ~/git/my-project
\$ npm link pie-client
C:\Users\me\git\my-project\node_modules\pie-client -> C:\Users\me\AppData\Roaming\npm\node_modules\pie-client -> C:\Users\me\git -> C:\Users\me\git\WebsocketPie\packages\PieClient

```

## Dev Ops

### Push Image to Docker Hub

```bash
# Note: you must log in to hub.docker.com first
USERNAME=YOUR_USERNAME
docker login --username=$USERNAME

# PACKAGE_VERSION modified from https://gist.github.com/DarrenN/8c6a5b969481725a4413
PACKAGE_VERSION=$(cat packages/PieServer/package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[", ]//g')
docker build -f ./packages/PieServer/Dockerfile -t $USERNAME/websocketpie-server:$PACKAGE_VERSION .
docker push $USERNAME/websocketpie-server:$PACKAGE_VERSION
# Update `latest` tag
docker push $USERNAME/websocketpie-server
```

### Create a droplet to run PieServer

Use the one-click app:
https://marketplace.digitalocean.com/apps/docker

Open the port
`ufw allow 8080`

### Build the image manually

In top level, run `npm run docker:build`

Why is the build command structured like this? Because docker hub builds in a similar way, from
top level with `-f` specifying the Dockerfile. This is why the dockerfile assumes that the PATH begins at the top level. This ensures that the packages/PieServer package.json is the one copied into `/app` and not the top level
package.json

### Poke around in the image

`docker container run -it --entrypoint "" TAG /bin/bash`

### Run the image

```sh
# Login to docker hub
USERNAME=YOUR_USERNAME
docker login --username=USERNAME
docker pull $USERNAME/websocketpie-server
docker container run -d -p 8080:8080/tcp --restart on-failure --name pie $USERNAME/websocketpie-server:latest
```

https://docs.docker.com/engine/reference/builder/#expose

```
The EXPOSE instruction does not actually publish the port. It functions as a type of documentation between the person who builds the image and the person who runs the container, about which ports are intended to be published. To actually publish the port when running the container, use the -p flag on docker run to publish and map one or more ports, or the -P flag to publish all exposed ports and map them to high-order ports.
```

Note: don't forget that `[OPTIONS]` **must** come before `IMAGE` in `docker run [OPTIONS] IMAGE [COMMAND] [ARG...]`

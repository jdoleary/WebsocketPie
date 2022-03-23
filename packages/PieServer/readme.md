# @websocketpie/server

## Getting Started
Start the server with `npx @websocketpie/server` or checkout the repository at https://github.com/jdoleary/WebsocketPie to run from source.

## Files

- index.js
  - Starts the PieServer.
- network.js
  - Handles socket specifics, parses JSON
- RoomManager.js
  - Holds rooms, handles adding clients to rooms, passes on data to room with metadata
- Room.js
  - A group of clients playing the same game

![NPM: @websocketpie/server](https://img.shields.io/npm/v/@websocketpie/server?color=brightgreen)
## Running the server

Note: It is recommended to use @websocketpie/server-bun with the bun runtime which is actually a different package
- via bunx
  - `bunx @websocketpie/server-bun`
- via bun.sh
  - `git clone https://github.com/jdoleary/WebsocketPie.git`
  - `cd packages/PieServer`
  - `bun install`
  - `bun start`

If you need to use the node runtime:
`npx @websocketpie/server@latest`

## Files

- index.js
  - Starts the PieServer.
- network.js
  - Handles socket specifics, parses JSON
- RoomManager.js
  - Holds rooms, handles adding clients to rooms, passes on data to room with metadata
- Room.js
  - A group of clients playing the same game

![NPM: @websocketpie/server](https://img.shields.io/npm/v/@websocketpie/server?color=brightgreen)
## Running the server
- via npx
  - `npx @websocketpie/server`
- via node.js
  - `git clone https://github.com/jdoleary/WebsocketPie.git`
  - `cd packages/PieServer`
  - `npm install`
  - `npm start`
- via docker
  - Get or build the image:
    - `docker pull jordanoleary/websocketpie-server` or `docker build -f ./packages/PieServer/Dockerfile -t jordanoleary/websocketpie-server .`
  - Run the image
    - `docker container run -d -p 8080:8080/tcp --restart on-failure jordanoleary/websocketpie-server`
- via DigitalOcean
  - [Launch a @websocketpie/server instance on DigitalOcean App Platform](https://cloud.digitalocean.com/apps/new?repo=https://github.com/jdoleary/WebsocketPie/tree/master)

## Files

- index.js
  - Starts the PieServer.
- network.js
  - Handles socket specifics, parses JSON
- RoomManager.js
  - Holds rooms, handles adding clients to rooms, passes on data to room with metadata
- Room.js
  - A group of clients playing the same game

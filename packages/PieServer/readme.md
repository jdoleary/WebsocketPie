# PieServer

Greater API can be found in the readme at top level. This document contains specifics only to PieServer.

## Files (abstract to specific)

- index.js
  - Starts the PieServer.
- network.js
  - Handles socket specifics, parses JSON
- RoomManager.js
  - Holds rooms, handles adding clients to rooms, passes on data to room with metadata
- Room.js
  - A group of clients playing the same game

# Info
Echo Server is a client-agnostic socket server, generally designed for turn-based multiplayer games.  It fascilitates lobbies/rooms for connecting players who are using a client of the same name and version.  Then messages are send from client to server, which echos the message to all other clients in the room.  In this way, the server doesn't care about the content of the game and can fascilitate any game (if latency allows).

# Files (abstract to specific)
- index.ts
    - Starts the Echo server.
- network.ts
    - Holds rooms, handles socket specifics
- room.ts
    - A group of clients and a single Game instance
    - Manages all games messages for the room including resetting the game instance
- game.ts
    - Handles game messages (still agnostic to which game)

# Tasks
- Remove frontend (it should be in a separate repo)
- Send client IDs along with echoed messages so that client can send messages to another specific client in the room
- Remove all server side game logic
- Should support rejoining if player disconnects
- Design API
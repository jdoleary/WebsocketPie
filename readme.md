# Info
Echo Server is a client-agnostic socket server, generally designed for turn-based multiplayer games.  It fascilitates lobbies/rooms for connecting players who are using a client of the same name and version.  Then messages are send from client to server, which echos the message to all other clients in the room.  In this way, the server doesn't care about the content of the game and can fascilitate any game (if latency allows).

# Files (abstract to specific)
- index.ts
    - Starts the Echo server.
- network.ts
    - Holds rooms, handles socket specifics
- room.ts
    - A group of clients playing the same game

# API
network.ts provides the main socket API.
Messages that SERVER is listening for:
- {type: 'data'} : Data from one client, to be echoed to other client(s) in the same room
- {type: 'joinRoom'} : When a client tries to join a room

Messages that CLIENTS should listen for:
- {type:'client'} : Info about all clients connected to a room.  Useful for displaying the state of the room lobby for example.
- {type: ANYTHING ELSE} : Data send from the server that is an echo of data that the server recieved from another client.  This is up to the client to implement

# Tasks
- Implement Client leave room
- Should support rejoining if player disconnect
- Room should enforce client type (game name) and version
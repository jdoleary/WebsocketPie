# Game Lobby
A node, socket.io game lobby that hosts the server and the frontend.  The frontend is contained inside of the server so that the server can host the frontend content.  This project is mainly a starter for **Turn-based js multiplayer games**

# Tech
Typescript
React

# Develop
Run parcel to automatically update the frontend with `npm start` from within `backend/frontend`.  However do not go to `localhost:1234` as it suggests, instead start the backend with `npm start` from `backend/` and it will server the html.  This is necessary so that the socket can connect
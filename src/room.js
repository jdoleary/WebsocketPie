/* This file contains utilities for creating and managing
a single instance of a room.
*/

const makeRoom = ({ app, version, name }) => {
  if (!(app && version && name)) {
    throw new Error("Cannot make room instance - app, version or name is undefined");
  }
  const room = {
    app,
    clients: [],
    name,
    version,
  };
  return room;
}

function getClientIndexInRoom({ client, room }) {
  const clientIndexInRoom = room.clients.findIndex(c => c.id === client.id);
  return clientIndexInRoom;
}

function addClientToRoom({ client, room }) {
  const clientIndexInRoom = getClientIndexInRoom({ client, room });
  if (clientIndexInRoom !== -1) {
    return;
  }
  room.clients.push(client);
}

function removeClientFromRoom({ client, room }) {
  const clientIndexInRoom = getClientIndexInRoom({ client, room });
  if (clientIndexInRoom === -1) {
    return;
  }
  room.clients.splice(clientIndexInRoom, 1);
}

module.exports = {
  makeRoom,
  getClientIndexInRoom,
  addClientToRoom,
  removeClientFromRoom,
};

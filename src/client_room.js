/* This file contains utilities for linking/unlinking a clients to a room. */

const { addClientToRoom, removeClientFromRoom } = require('./room');

function linkClientAndRoom({ client, room }) {
  Object.assign(client, { room });
  addClientToRoom({ client, room });
}

function unlinkClientAndRoom({ client, room }) {
  if (client.room) {
    delete client.room;
  }
  removeClientFromRoom({ client, room });
}

module.exports = {
  linkClientAndRoom,
  unlinkClientAndRoom,
};
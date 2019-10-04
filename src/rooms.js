/* This file maintains an object of all rooms in existence,
and utilities to modify that object.
*/

const { makeRoom } = require('./room');

// string -> room[]
let appVersionToRoomGroupMap = {};

function getAppVersionKey({ app, version }) {
  if (!(app && version)) {
    throw new Error("Cannot get app version key - app or version undefined");
  }
  const appVersionKey = `${app}-${version}`;
  return appVersionKey;
}

function findRoomGroup({ app, version }) {
  const appVersionKey = getAppVersionKey({ app, version });
  const roomGroup = appVersionToRoomGroupMap[appVersionKey];
  return roomGroup;
}

function findOrMakeRoomGroup({ app, version }) {
  const existingRoomGroup = findRoomGroup({ app, version });
  if (existingRoomGroup) {
    return existingRoomGroup;
  }
  const appVersionKey = getAppVersionKey({ app, version });
  const newRoomGroup = [];
  appVersionToRoomGroupMap[appVersionKey] = newRoomGroup;
  return newRoomGroup;
}

function deleteRoomGroup({ app, version }) {
  const appVersionKey = getAppVersionKey({ app, version });
  delete appVersionToRoomGroupMap[appVersionKey];
}

function findRoom({ app, version, name }) {
  if (!name) {
    throw new Error("Cannot get room - name undefined");
  }
  const roomGroup = findRoomGroup({ app, version });
  if (!roomGroup) {
    return undefined;
  }
  const room = roomGroup.find(room => room.name === name);
  return room;
}

function findOrMakeRoom({ app, version, name }) {
  if (!name) {
    throw new Error("Cannot get or make room - name undefined");
  }
  const roomGroup = findOrMakeRoomGroup({ app, version });
  const existingRoom = roomGroup.find(room => room.name === name);
  if (existingRoom) {
    return existingRoom;
  }
  const newRoom = makeRoom({ app, version, name });
  roomGroup.push(newRoom);
  return newRoom;
}

function deleteRoom({ app, version, name }) {
  if (!name) {
    throw new Error("Cannot get or make room - name undefined");
  }
  const roomGroup = findRoomGroup({ app, version });
  if (!roomGroup) {
    return;
  }


  const existingRoom = roomGroup.find(room => room.name === name);
  if (existingRoom) {
    return existingRoom;
  }
  const newRoom = makeRoom({ app, version, name });
  roomGroup.push(newRoom);
  return newRoom;
}

module.exports = {
  findRoomGroup,
  findOrMakeRoomGroup,
  deleteRoomGroup,
  findRoom,
  findOrMakeRoom,
  deleteRoom,
};
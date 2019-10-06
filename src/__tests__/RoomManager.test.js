const test = require('tape');
const RoomManager = require('../RoomManager');

const makeFakeWSClientObject = () => ({
  send: () => {},
});

test('findOrMakeRoom', t => {
  const rm = new RoomManager();
  /* Verify that findOrMakeRoom return undefined if arguments are missing. */
  const r1 = rm.findOrMakeRoom({});
  t.equal(r1, undefined);
  const r2 = rm.findOrMakeRoom({ name: 'AlphaRoom', version: '1.0.0' });
  t.equal(r2, undefined);
  t.equal(rm.rooms.length, 0);
  const r3 = rm.findOrMakeRoom({ app: 'StealthEmUp', version: '1.0.0' });
  t.equal(r3, undefined);
  t.equal(rm.rooms.length, 0);
  const r4 = rm.findOrMakeRoom({ app: 'StealthEmUp', name: 'AlphaRoom' });
  t.equal(r4, undefined);
  t.equal(rm.rooms.length, 0);
  const r5 = rm.findOrMakeRoom({ app: 'StealthEmUp' });
  t.equal(r5, undefined);
  t.equal(rm.rooms.length, 0);
  const r6 = rm.findOrMakeRoom({ name: 'AlphaRoom' });
  t.equal(r6, undefined);
  t.equal(rm.rooms.length, 0);
  const r7 = rm.findOrMakeRoom({ version: '1.0.0' });
  t.equal(r7, undefined);
  t.equal(rm.rooms.length, 0);
  /* Verify that a new room is created when all arguments are present. */
  const roomInfo = {
    app: 'StealthEmUp',
    name: 'AlphaRoom',
    version: '1.0.0',
  };
  const r8 = rm.findOrMakeRoom(roomInfo);
  t.notEqual(r8, undefined);
  t.equal(r8.app, roomInfo.app);
  t.equal(r8.name, roomInfo.name);
  t.equal(r8.version, roomInfo.version);
  t.equal(rm.rooms.length, 1);
  t.equal(rm.rooms[0].app, roomInfo.app);
  t.equal(rm.rooms[0].name, roomInfo.name);
  t.equal(rm.rooms[0].version, roomInfo.version);
  /* Verify an existing room is returned if it matches arguments. */
  const r9 = rm.findOrMakeRoom(roomInfo);
  t.notEqual(r9, undefined);
  t.equal(r9.app, roomInfo.app);
  t.equal(r9.name, roomInfo.name);
  t.equal(r9.version, roomInfo.version);
  t.equal(rm.rooms.length, 1);

  t.end();
});

test('addClientToRoom', t => {
  const rm = new RoomManager();
  const client = makeFakeWSClientObject();
  const name = 'Client';
  const roomInfo = {
    app: 'StealthEmUp',
    name: 'AlphaRoom',
    version: '1.0.0',
  };
  /* Verify a client is not added if arguments are missing. */
  const r1 = rm.addClientToRoom({});
  t.equal(r1, false);
  t.equal(client.room, undefined);
  t.equal(rm.rooms.length, 0);
  const r2 = rm.addClientToRoom({ client });
  t.equal(r2, false);
  t.equal(client.room, undefined);
  t.equal(rm.rooms.length, 0);
  const r3 = rm.addClientToRoom({ name });
  t.equal(r3, false);
  t.equal(client.room, undefined);
  t.equal(rm.rooms.length, 0);
  const r4 = rm.addClientToRoom({ roomInfo });
  t.equal(r4, false);
  t.equal(client.room, undefined);
  t.equal(rm.rooms.length, 0);
  const r5 = rm.addClientToRoom({ name, roomInfo });
  t.equal(r5, false);
  t.equal(client.room, undefined);
  t.equal(rm.rooms.length, 0);
  const r6 = rm.addClientToRoom({ client, roomInfo });
  t.equal(r6, false);
  t.equal(client.room, undefined);
  t.equal(rm.rooms.length, 0);
  const r7 = rm.addClientToRoom({ client, name });
  t.equal(r7, false);
  t.equal(client.room, undefined);
  t.equal(rm.rooms.length, 0);
  /* Verify the client <-> room link is established if all arguments are present. */
  const r8 = rm.addClientToRoom({ client, name, roomInfo });
  t.equal(r8, true);
  t.notEqual(client.room, undefined);
  t.equal(client.room.app, roomInfo.app);
  t.equal(client.room.name, roomInfo.name);
  t.equal(client.room.version, roomInfo.version);
  t.equal(rm.rooms.length, 1);
  t.equal(rm.rooms[0].app, roomInfo.app);
  t.equal(rm.rooms[0].name, roomInfo.name);
  t.equal(rm.rooms[0].version, roomInfo.version);
  t.equal(rm.rooms[0].clients.length, 1);
  t.equal(rm.rooms[0].clients[0].name, name);

  t.end();
});

test('emitToClientRoom', t => {
  const rm = new RoomManager();
  const client = makeFakeWSClientObject();
  const message = 'anything';
  /* Verify that missing arguments return false. */
  const r1 = rm.emitToClientRoom({});
  t.equal(r1, false);
  const r2 = rm.emitToClientRoom({ client });
  t.equal(r2, false);
  const r3 = rm.emitToClientRoom({ message });
  t.equal(r3, false);
  /* Verify that client not in room returns false. */
  const r4 = rm.emitToClientRoom({ client, message });
  t.equal(r4, false);
  // Client is in a room, should return true.
  const name = 'Client';
  const roomInfo = {
    app: 'StealthEmUp',
    name: 'AlphaRoom',
    version: '1.0.0',
  };
  rm.addClientToRoom({ client, name, roomInfo });
  const r5 = rm.emitToClientRoom({ client, message });
  t.equal(r5, true);

  t.end();
});

test('removeClientFromCurrentRoom', t => {
  const rm = new RoomManager();
  const client = makeFakeWSClientObject();
  const name = 'Client';
  const roomInfo = {
    app: 'StealthEmUp',
    name: 'AlphaRoom',
    version: '1.0.0',
  };
  rm.addClientToRoom({ client, name, roomInfo });
  t.equal(client.name, name);
  t.notEqual(client.room, undefined);
  rm.removeClientFromCurrentRoom(client);
  t.equal(client.name, undefined);
  t.equal(client.room, undefined);

  t.end();
});

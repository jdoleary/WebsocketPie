const test = require('tape');
const Room = require('../Room');
const { fuzzyMatchRooms } = require('../util');

test('fuzzyMatchRooms should match rooms by app', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { app: willMatch.app });
  const { app, name, version } = willMatch;
  t.deepEqual(foundRooms, [{ app, name, version }]);
  t.end();
});

test('fuzzyMatchRooms should match rooms by name', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { name: willMatch.name });
  const { app, name, version } = willMatch;
  t.deepEqual(foundRooms, [{ app, name, version }]);
  t.end();
});

test('fuzzyMatchRooms should match rooms by exact version', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { version: willMatch.version });
  const { app, name, version } = willMatch;
  t.deepEqual(foundRooms, [{ app, name, version }]);
  t.end();
});

test('fuzzyMatchRooms should match rooms by fuzzy version', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });
  const willMatch2 = new Room({ app: 'app1', name: 'name2', version: '1.0.4' });

  const rooms = [willMatch, willMatch2, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { app: willMatch.app, version: '1.0' });
  t.deepEqual(foundRooms, [
    { app: willMatch.app, name: willMatch.name, version: willMatch.version },
    { app: willMatch2.app, name: willMatch2.name, version: willMatch2.version },
  ]);
  t.end();
});

test('Returns all rooms if roomInfo is undefined', t => {
  const r0 = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });
  const r1 = new Room({ app: 'app1', name: 'name2', version: '1.0.4' });
  const r2 = new Room({ app: 'app2', name: 'name2', version: '2.0.0' });
  const rooms = [r0, r1, r2];

  const foundRooms = fuzzyMatchRooms(rooms, undefined);

  t.equal(foundRooms.length, 3, 'fuzzyMatchRooms should return all rooms');
  foundRooms.forEach((room, index) => {
    t.comment(`assert r${index} is in the array of found rooms`);
    t.equal(room.app, rooms[index].app);
    t.equal(room.name, rooms[index].name);
    t.equal(room.version, rooms[index].version);
  });

  t.end();
});

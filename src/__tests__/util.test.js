const test = require('tape');
const Room = require('../Room');
const { fuzzyMatchRooms } = require('../util');

test('fuzzyMatchRooms should match rooms by app', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { app: willMatch.app });
  // Remove the clients array for the sake of comparison
  delete willMatch.clients;
  t.deepEqual(foundRooms, [willMatch]);
  t.end();
});

test('fuzzyMatchRooms should match rooms by name', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { name: willMatch.name });
  // Remove the clients array for the sake of comparison
  delete willMatch.clients;
  t.deepEqual(foundRooms, [willMatch]);
  t.end();
});

test('fuzzyMatchRooms should match rooms by exact version', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { version: willMatch.version });
  // Remove the clients array for the sake of comparison
  delete willMatch.clients;
  t.deepEqual(foundRooms, [willMatch]);
  t.end();
});

test('fuzzyMatchRooms should match rooms by fuzzy version', t => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });
  const willMatch2 = new Room({ app: 'app1', name: 'name2', version: '1.0.4' });

  const rooms = [willMatch, willMatch2, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { app: willMatch.app, version: '1.0' });
  // Remove the clients array for the sake of comparison
  delete willMatch.clients;
  delete willMatch2.clients;
  t.deepEqual(foundRooms, [willMatch, willMatch2]);
  t.end();
});

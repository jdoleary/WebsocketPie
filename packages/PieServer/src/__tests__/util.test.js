import { expect, test } from "bun:test";
const Room = require('../Room');
const { fuzzyMatchRooms, parseQueryString } = require('../util');

test('parseQueryString should extract querystrings', done => {
  const actual = parseQueryString('ws://localhost:8080?test=123&two=2')
  const expected = {test:"123", two:"2"}
  expect(actual).toEqual(expected);

  done();
});

test('fuzzyMatchRooms should match rooms by app', done => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { app: willMatch.app });
  const { app, name, version } = willMatch;
  expect(foundRooms).toEqual([{ app, name, version }]);
  done();
});

test('fuzzyMatchRooms should match rooms by name', done => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { name: willMatch.name });
  const { app, name, version } = willMatch;
  expect(foundRooms).toEqual([{ app, name, version }]);
  done();
});

test('fuzzyMatchRooms should match rooms by exact version', done => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });

  const rooms = [willMatch, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { version: willMatch.version });
  const { app, name, version } = willMatch;
  expect(foundRooms).toEqual([{ app, name, version }]);
  done();
});

test('fuzzyMatchRooms should match rooms by fuzzy version', done => {
  const willMatch = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });
  const willMatch2 = new Room({ app: 'app1', name: 'name2', version: '1.0.4' });

  const rooms = [willMatch, willMatch2, new Room({ app: 'app2', name: 'name2', version: '2.0.0' })];
  const foundRooms = fuzzyMatchRooms(rooms, { app: willMatch.app, version: '1.0' });
  expect(foundRooms).toEqual([
    { app: willMatch.app, name: willMatch.name, version: willMatch.version },
    { app: willMatch2.app, name: willMatch2.name, version: willMatch2.version },
  ]);
  done();
});

test('Returns all rooms if roomInfo is undefined', done => {
  const r0 = new Room({ app: 'app1', name: 'name1', version: '1.0.0' });
  const r1 = new Room({ app: 'app1', name: 'name2', version: '1.0.4' });
  const r2 = new Room({ app: 'app2', name: 'name2', version: '2.0.0' });
  const rooms = [r0, r1, r2];

  const foundRooms = fuzzyMatchRooms(rooms, undefined);

  expect(foundRooms.length).toEqual(3);// 'fuzzyMatchRooms should return all rooms');
  foundRooms.forEach((room, index) => {
    // t.comment(`assert r${index} is in the array of found rooms`);
    expect(room.app).toEqual(rooms[index].app);
    expect(room.name).toEqual( rooms[index].name);
    expect(room.version).toEqual( rooms[index].version);
  });

  done();
});

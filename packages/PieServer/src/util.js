function fuzzyMatchRooms(rooms, roomInfo) {
  const foundRooms = !roomInfo
    ? // Return all rooms if there is no roomInfo to search by
      rooms
    : // Find rooms that match roomInfo
      rooms.filter(r => {
        // Filters on app, name and version but does not require any of them
        return (
          (roomInfo.app ? r.app === roomInfo.app : true) &&
          (roomInfo.name ? r.name === roomInfo.name : true) &&
          // Allow for fuzzy version matching
          // ex: '1.0' should match '1.0.1'
          (roomInfo.version ? r.version.startsWith(roomInfo.version) : true)
        );
      });

  return (
    foundRooms
      // Exclude hidden rooms
      .filter(r => !r.hidden)
      // Only return the properties that are expected for the 'rooms' message
      // This prevents the stringify 'circular structure' error
      .map(r => ({ app: r.app, name: r.name, version: r.version }))
  );
}

module.exports = {
  fuzzyMatchRooms,
};

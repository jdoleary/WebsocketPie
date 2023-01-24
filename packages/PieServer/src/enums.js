const MessageType = {
  // Both client and server:
  Data: 'Data',
  // Server to client:
  Rooms: 'Rooms',
  ClientPresenceChanged: 'ClientPresenceChanged',
  ServerAssignedData: 'ServerAssignedData',
  Err: 'Err',
  ResolvePromise: 'ResolvePromise',
  RejectPromise: 'RejectPromise',
  // Client to Server:
  JoinRoom: 'JoinRoom',
  LeaveRoom: 'LeaveRoom',
  GetRooms: 'GetRooms',
  GetStats: 'GetStats',
  // Unique to PieClient
  ConnectInfo: 'ConnectInfo',
};

const DataSubType = {
  Together: 'Together',
  Whisper: 'Whisper',
};

module.exports = {
  MessageType,
  DataSubType,
};

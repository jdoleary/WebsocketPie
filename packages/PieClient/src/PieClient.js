const WebSocket = require('ws');
const MessageType = require('./MessageType');

/*
env: 'development' | 'production'
wsUri: websocket uri of an echo server instance
ws: websocket connection
onData: a callback that is send data emitted by the echo server
onInfo: a callback to send information about the connection
onError: a callback to send error messages
*/

class PieClient {
  constructor({ env, wsUri, onData, onError, onServerAssignedData, onClientPresenceChanged, onRooms, onConnectInfo }) {
    this.env = env;
    this.wsUri = wsUri;
    this.onData = onData;
    this.onError = onError;
    this.onServerAssignedData = onServerAssignedData;
    this.onClientPresenceChanged = onClientPresenceChanged;
    this.onRooms = onRooms;
    this.onConnectInfo = onConnectInfo;
    this.connected = false;

    this.ws = new WebSocket(wsUri);
    this.ws.on('message', data => {
      try {
        const message = JSON.parse(data);
        switch (message.type) {
          case MessageType.Data:
            this.onData(message);
            break;
          case MessageType.ServerAssignedData:
            if (this.onServerAssignedData) {
              this.onServerAssignedData(message);
            }
            break;
          case MessageType.ClientPresenceChanged:
            if (this.onClientPresenceChanged) {
              this.onClientPresenceChanged(message);
            }
            break;
          case MessageType.Rooms:
            if (this.onRooms) {
              this.onRooms(message);
            }
            break;
          default:
            console.error(`Message of type ${message.type} not recognized!`);
        }
      } catch (e) {
        console.error(e);
        this.onError(e);
      }
    });
    this.ws.on('open', () => {
      this.connected = true;
      if (this.onConnectInfo) {
        this.onConnectInfo({
          type: MessageType.ConnectInfo,
          connected: this.connected,
          msg: `Opened connection to ${this.wsUri}`,
        });
      }
    });
    this.ws.on('close', () => {
      this.connected = false;
      if (this.onConnectInfo) {
        this.onConnectInfo({
          type: MessageType.ConnectInfo,
          connected: this.connected,
          msg: `Connection to ${this.wsUri} closed.`,
        });
      }
    });
  }
  joinRoom(roomInfo) {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.JoinRoom,
          roomInfo,
        }),
      );
    } else {
      this.onError({ msg: `Cannot join room, not currently connected to web socket server` });
    }
  }
  leaveRoom() {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.LeaveRoom,
        }),
      );
    } else {
      this.onError({ msg: `Cannot leave room, not currently connected to web socket server` });
    }
  }
  getRooms(roomInfo) {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.GetRooms,
          roomInfo,
        }),
      );
    } else {
      this.onError({ msg: `Cannot get rooms, not currently connected to web socket server` });
    }
  }
  sendData(payload) {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.Data,
          payload,
        }),
      );
    } else {
      this.onError({ msg: `Cannot send data to room, not currently connected to web socket server` });
    }
  }
}
module.exports = PieClient;
const WebSocket = require('ws');

/*
env: 'development' | 'production'
wsUri: websocket uri of an echo server instance
ws: websocket connection
onData: a callback that is send data emitted by the echo server
onInfo: a callback to send information about the connection
onError: a callback to send error messages
*/

const env = {
  development: 'development',
  production: 'production',
};
class PieClient {
  constructor({ env, wsUri, onData, onInfo, onError }) {
    this.env = env;
    this.wsUri = wsUri;
    this.onData = onData;
    this.onInfo = onInfo;
    this.onError = onError;
    this.connected = false;

    this.ws = new WebSocket(wsUri);
    this.ws.on('message', data => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data') {
          this.onData(message);
        } else {
          this.onInfo(message);
        }
      } catch (e) {
        this.onError(e);
      }
    });
    this.ws.on('open', () => {
      this.connected = true;
      this.onInfo({ type: 'connectInfo', connected: this.connected, msg: `Opened connection to ${this.wsUri}` });
    });
    this.ws.on('close', () => {
      this.connected = false;
      this.onInfo({ type: 'connectInfo', connected: this.connected, msg: `Connection to ${this.wsUri} closed.` });
    });
  }
  joinRoom(roomInfo) {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: 'joinRoom',
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
          type: 'leaveRoom',
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
          type: 'getRooms',
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
          type: 'data',
          payload,
        }),
      );
    } else {
      this.onError({ msg: `Cannot send data to room, not currently connected to web socket server` });
    }
  }
}
module.exports = PieClient;

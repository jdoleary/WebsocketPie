const { MessageType } = require('./enums');

/*
env: 'development' | 'production'
wsUri: websocket uri of a PieServer instance
ws: websocket connection
onData: a callback that is send data emitted by the PieServer
onInfo: a callback to send information about the connection
onError: a callback to send error messages
*/

class PieClient {
  constructor({
    env = 'development',
    wsUri,
    onData,
    onError,
    onServerAssignedData,
    onClientPresenceChanged,
    onRooms,
    onConnectInfo,
  }) {
    this.env = env;
    this.wsUri = wsUri;
    this.onData = onData;
    this.onError = onError || console.error;
    this.onServerAssignedData = onServerAssignedData;
    this.onClientPresenceChanged = onClientPresenceChanged;
    this.onRooms = onRooms;
    this.onConnectInfo = onConnectInfo;
    this.connected = false;
    this.promiseCBs = {
      makeRoom: null,
      joinRoom: null,
    };
    // Optionally support a connection status element
    this.statusElement = document.querySelector('#websocket-pie-connection-status');
    if (this.statusElement) {
      this.statusElement.style['pointer-events'] = 'none';
      this.statusElement.style['position'] = 'absolute';
      this.statusElement.style['top'] = '10px';
      this.statusElement.style['left'] = '10px';
      this.statusElement.style['user-select'] = 'none';
    }

    this.ws = new WebSocket(wsUri);
    this.ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case MessageType.Data:
            this.onData(message);
            break;
          case MessageType.ResolvePromise:
            if (this.promiseCBs[message.func]) {
              this.promiseCBs[message.func].resolve();
            }
            break;
          case MessageType.RejectPromise:
            if (this.promiseCBs[message.func]) {
              this.promiseCBs[message.func].reject(message.err);
            }
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
          case MessageType.Err:
            console.error(message);
            this.onError(message);
            break;
          default:
            console.log(message);
            console.error(`Above message of type ${message.type} not recognized!`);
        }
      } catch (e) {
        console.error(e);
        this.onError(e);
      }
    };
    this.ws.onopen = () => {
      this.connected = true;
      if (this.onConnectInfo) {
        if (this.statusElement) {
          this.statusElement.innerHTML = `⬤ ${this.connected ? 'Connected' : 'Disconnected'}`;
          this.statusElement.style.color = this.connected ? 'green' : 'red';
        }
        this.onConnectInfo({
          type: MessageType.ConnectInfo,
          connected: this.connected,
          msg: `Opened connection to ${this.wsUri}`,
        });
      }
    };
    this.ws.onclose = () => {
      this.connected = false;
      if (this.onConnectInfo) {
        this.onConnectInfo({
          type: MessageType.ConnectInfo,
          connected: this.connected,
          msg: `Connection to ${this.wsUri} closed.`,
        });
      }
    };
  }
  makeRoom(roomInfo) {
    if (this.connected) {
      // Cancel previous makeRoom promise if it exists
      if (this.promiseCBs[MessageType.MakeRoom]) {
        this.promiseCBs[MessageType.MakeRoom].reject({ msg: 'Cancelled due to newer makeRoom request' });
      }
      return new Promise((resolve, reject) => {
        // Assign callbacks so that the response from the server can
        // fulfill this promise
        this.promiseCBs[MessageType.MakeRoom] = { resolve, reject };
        this.ws.send(
          JSON.stringify({
            type: MessageType.MakeRoom,
            roomInfo,
          }),
        );
      });
    } else {
      return Promise.reject({ msg: `Cannot make room, not currently connected to web socket server` });
    }
  }
  joinRoom(roomInfo) {
    if (this.connected) {
      // Cancel previous joinRoom promise if it exists
      if (this.promiseCBs[MessageType.JoinRoom]) {
        this.promiseCBs[MessageType.JoinRoom].reject({ msg: 'Cancelled due to newer joinRoom request' });
      }
      return new Promise((resolve, reject) => {
        // Assign callbacks so that the response from the server can
        // fulfill this promise
        this.promiseCBs[MessageType.JoinRoom] = { resolve, reject };
        this.ws.send(
          JSON.stringify({
            type: MessageType.JoinRoom,
            roomInfo,
          }),
        );
      });
    } else {
      return Promise.reject({ msg: `Cannot join room, not currently connected to web socket server` });
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
  sendData(payload, extras) {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.Data,
          payload,
          ...extras,
        }),
      );
    } else {
      this.onError({ msg: `Cannot send data to room, not currently connected to web socket server` });
    }
  }
}
module.exports = PieClient;

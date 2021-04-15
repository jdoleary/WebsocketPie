import { MessageType } from './enums';
import { version } from '../package.json';
/*
env: 'development' | 'production'
wsUri: websocket uri of a PieServer instance
ws: websocket connection
onData: a callback that is send data emitted by the PieServer
onInfo: a callback to send information about the connection
onError: a callback to send error messages
*/
interface ConnectInfo {
  type: string;
  connected: boolean;
  msg: string;
}
interface ServerAssignedData {
  type: string;
  clientId: string;
  serverVersion: string;
}
export interface OnDataArgs {
  type: string;
  fromClient: string;
  payload: any;
}
export interface ClientPresenceChangedArgs {
  type: string;
  clients: string[];
  clientThatChanged: string;
  time: number;
  present: boolean;
}
interface Room {
  app: string;
  name: string;
  version: string;
}
interface OnRoomsArgs {
  type: string;
  rooms: Room[];
}

export default class PieClient {
  env: string;
  wsUri: string;
  onData: (x: OnDataArgs) => void;
  onError: (x: { message: string }) => void;
  onServerAssignedData: (x: ServerAssignedData) => void;
  onClientPresenceChanged: (c: ClientPresenceChangedArgs) => void;
  onRooms: (x: OnRoomsArgs) => void;
  onConnectInfo: (c: ConnectInfo) => void;
  connected: boolean;
  promiseCBs: {
    makeRoom: () => void;
    joinRoom: () => void;
  };
  statusElement?: HTMLElement;
  ws: WebSocket;
  constructor({ env = 'development', wsUri }) {
    console.log(`WebSocketPie Client v${version} ${env}`);
    this.env = env;
    this.wsUri = wsUri;
    this.onError = console.error;
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
        const message: any = JSON.parse(event.data);
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
            this._updateDebugInfo(message);
            // If client is accepting the onClientPresenceChanged callback,
            // send the message to it
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
      this._updateDebugInfo();
      // If client is accepting the onConnectInfo callback,
      // send the message to it
      if (this.onConnectInfo) {
        this.onConnectInfo({
          type: MessageType.ConnectInfo,
          connected: this.connected,
          msg: `Opened connection to ${this.wsUri}`,
        });
      }
    };
    this.ws.onclose = () => {
      this.connected = false;
      this._updateDebugInfo();
      // If client is accepting the onConnectInfo callback,
      // send the message to it
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
        this.promiseCBs[MessageType.MakeRoom].reject({ message: 'Cancelled due to newer makeRoom request' });
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
      return Promise.reject({ message: `Cannot make room, not currently connected to web socket server` });
    }
  }
  joinRoom(roomInfo) {
    if (this.connected) {
      // Cancel previous joinRoom promise if it exists
      if (this.promiseCBs[MessageType.JoinRoom]) {
        this.promiseCBs[MessageType.JoinRoom].reject({ message: 'Cancelled due to newer joinRoom request' });
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
      return Promise.reject({ message: `Cannot join room, not currently connected to web socket server` });
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
      this.onError({ message: `Cannot leave room, not currently connected to web socket server` });
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
      this.onError({ message: `Cannot get rooms, not currently connected to web socket server` });
    }
  }
  sendData(payload: object, extras?: object) {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.Data,
          payload,
          ...extras,
        }),
      );
    } else {
      this.onError({ message: `Cannot send data to room, not currently connected to web socket server` });
    }
  }
  _updateDebugInfo(message?: { clients: object[] }) {
    try {
      if (this.statusElement) {
        if (this.connected) {
          const numberOfClients = (message && message.clients && message.clients.length) || 1;
          this.statusElement.innerHTML = `⬤ ${numberOfClients == 1 ? `${numberOfClients} User` : `${numberOfClients} Users`
            } Connected`;
        } else {
          this.statusElement.innerHTML = `⬤ Disconnected`;
        }
        this.statusElement.style.color = this.connected ? 'green' : 'red';
      }
    } catch (e) {
      console.error(e);
    }
  }
}

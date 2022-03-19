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
export interface ConnectInfo {
  type: string;
  connected: boolean;
  msg: string;
}
export interface ServerAssignedData {
  type: string;
  clientId: string;
  serverVersion: string;
}
export interface OnDataArgs {
  type: string;
  subType: string;
  fromClient: string;
  payload: any;
  time: number;
}
export interface ClientPresenceChangedArgs {
  type: string;
  clients: string[];
  clientThatChanged: string;
  time: number;
  present: boolean;
}
export interface Room {
  app: string;
  name: string;
  version: string;
  maxClients?: number;
  togetherTimeoutMs?: number;
  hidden?: boolean;
}
export interface OnRoomsArgs {
  type: string;
  rooms: Room[];
}

export interface Latency {
  min: number;
  max: number;
  averageDataPoints: number[];
  average: number;
}
const maxLatencyDataPoints = 14;
export default class PieClient {
  env: string;
  wsUri: string;
  onData: (x: OnDataArgs) => void;
  onError: (x: { message: string }) => void;
  onServerAssignedData: (x: ServerAssignedData) => void;
  onClientPresenceChanged: (c: ClientPresenceChangedArgs) => void;
  onRooms: (x: OnRoomsArgs) => void;
  onConnectInfo: (c: ConnectInfo) => void;
  onLatency?: (l: Latency) => void;
  connected: boolean;
  // promiseCBs is useful for storing promise callbacks (resolve, reject)
  // that need to be invoked in a different place than where they were created.
  // Since PieClient does a lot of asyncronous work through websockets, a 
  // promise that was created with the sending of one message
  // over a websocket must be able to be resolved by the reception of another
  // message over a websocket. promiseCBs fascilitates this pattern.
  promiseCBs: {
    joinRoom: { resolve: () => void, reject: () => void };
  };
  currentRoomInfo: Room;
  statusElement?: HTMLElement;
  ws: WebSocket;
  stats: {
    latency: Latency;
  };
  currentClientId: string;
  reconnectTimeoutId: ReturnType<typeof setTimeout>;
  reconnectAttempts: number;

  constructor({ env = 'development', wsUri, useStats }) {
    console.log(`Pie: WebSocketPie Client v${version} ${env}`);
    this.env = env;
    this.wsUri = wsUri;
    this.onError = console.error;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.promiseCBs = {
      joinRoom: null,
    };
    this.currentClientId = '';
    // Optionally support a connection status element
    this.statusElement = document.querySelector('#websocket-pie-connection-status');
    if (this.statusElement) {
      this.statusElement.style['pointer-events'] = 'none';
      this.statusElement.style['position'] = 'absolute';
      this.statusElement.style['top'] = '10px';
      this.statusElement.style['left'] = '10px';
      this.statusElement.style['user-select'] = 'none';
    }
    this.stats = {
      latency: {
        min: Number.MAX_SAFE_INTEGER,
        max: 0,
        averageDataPoints: [],
        average: NaN,
      },
    };

    this.connect(wsUri, useStats);
  }
  connect(wsUri, useStats) {
    console.log(`Pie: pie-client: connecting to ${wsUri}...`);
    this.ws = new WebSocket(wsUri);
    this.ws.onmessage = event => {
      try {
        const message: any = JSON.parse(event.data);
        // Disregard messages from self, since they are returned to the self client immediately
        // to prevent input lag
        if (message.fromClient !== this.currentClientId) {
          this.handleMessage(message, useStats);
        }
      } catch (e) {
        console.error(e);
        this.onError(e);
      }
    };
    this.ws.onopen = () => {
      console.log(`Pie: pie-client: connected!`);
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
      if (this.currentRoomInfo) {
        console.log("Pie: Rejoining room", this.currentRoomInfo)
        this.joinRoom(this.currentRoomInfo, true)
      }
      // Reset reconnect attempts now that the connection is successfully opened
      this.reconnectAttempts = 0;
    };
    this.ws.onerror = err => console.error('pie-client error:', err);
    this.ws.onclose = () => {
      console.log(`Pie: pie-client: connection closed.`);
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
      // Try reconnect
      clearTimeout(this.reconnectTimeoutId);
      const tryReconnectAgainInMillis = Math.pow(this.reconnectAttempts, 2) * 50;
      console.log(
        `Pie: pie-client: Reconnect attempt ${this.reconnectAttempts +
        1}; will try to reconnect automatically in ${tryReconnectAgainInMillis} milliseconds.`,
      );
      this.reconnectTimeoutId = setTimeout(() => {
        this.connect(wsUri, useStats);
      }, tryReconnectAgainInMillis);
      // Increment reconenctAttempts since successful connect
      this.reconnectAttempts++;
    };
  }
  handleMessage(message: any, useStats: boolean) {
    if (useStats && message.time) {
      const currentMessageLatency = Date.now() - message.time;
      if (currentMessageLatency > this.stats.latency.max) {
        this.stats.latency.max = currentMessageLatency;
      }
      if (currentMessageLatency < this.stats.latency.min) {
        this.stats.latency.min = currentMessageLatency;
      }
      this.stats.latency.averageDataPoints.push(currentMessageLatency);

      if (this.stats.latency.averageDataPoints.length > maxLatencyDataPoints) {
        // Remove the oldest so the averageDataPoints array stays a fixed size
        this.stats.latency.averageDataPoints.shift();
        this.stats.latency.average =
          this.stats.latency.averageDataPoints.reduce((acc, cur) => acc + cur, 0) /
          this.stats.latency.averageDataPoints.length;
        // Broadcast latency information
        if (this.onLatency) {
          this.onLatency(this.stats.latency);
        }
      }
    }
    switch (message.type) {
      case MessageType.Data:
        this.onData(message);
        break;
      case MessageType.ResolvePromise:
        if (this.promiseCBs[message.func]) {
          this.promiseCBs[message.func].resolve(message.data);
        }
        break;
      case MessageType.RejectPromise:
        if (this.promiseCBs[message.func]) {
          this.promiseCBs[message.func].reject(message.err);
        }
        break;
      case MessageType.ServerAssignedData:
        this.currentClientId = message.clientId;
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
        console.log('Pie:', message);
        console.error(`Pie: Above message of type ${message.type} not recognized!`);
    }
  }
  makeRoom(roomInfo: Room) {
    this.joinRoom(roomInfo, true);
  }
  joinRoom(roomInfo: Room, makeRoomIfNonExistant: boolean = false) {
    if (this.connected) {
      // Cancel previous makeRoom promise if it exists
      if (this.promiseCBs[MessageType.JoinRoom]) {
        this.promiseCBs[MessageType.JoinRoom].reject({ message: `Cancelled due to newer ${MessageType.JoinRoom} request` });
      }
      return new Promise((resolve, reject) => {
        // Assign callbacks so that the response from the server can
        // fulfill this promise
        this.promiseCBs[MessageType.JoinRoom] = { resolve, reject };
        this.ws.send(
          JSON.stringify({
            type: MessageType.JoinRoom,
            roomInfo,
            makeRoomIfNonExistant
          }),
        );
      }).then((currentRoomInfo: any) => {
        if (typeof currentRoomInfo.app === 'string' && typeof currentRoomInfo.name === 'string' && typeof currentRoomInfo.version === 'string') {
          console.log(`Pie: ${MessageType.JoinRoom} successful with`, currentRoomInfo);
          // Save roomInfo to allow auto rejoining should the server restart
          this.currentRoomInfo = currentRoomInfo;
        } else {
          console.error("Pie: joinRoom succeeded but currentRoomInfo is maleformed:", currentRoomInfo);
        }
      });
    } else {
      return Promise.reject({ message: `${MessageType.JoinRoom} failed, not currently connected to web socket server` });
    }
  }
  leaveRoom() {
    if (this.connected) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.LeaveRoom,
        }),
      );
      this.currentRoomInfo = undefined;
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
  sendData(payload: any, extras?: object) {
    if (this.connected) {
      const message = {
        type: MessageType.Data,
        payload,
        ...extras,
      };
      this.ws.send(JSON.stringify(message));
      // Handle own message immediately to reduce lag
      this.handleMessage({ fromClient: this.currentClientId, ...message }, false);
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

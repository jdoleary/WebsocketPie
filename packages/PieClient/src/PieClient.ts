import { MessageType } from './enums';
import { version } from '../package.json';
/*
env: 'development' | 'production'
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
  onData?: (x: OnDataArgs) => void;
  onError?: ((x: { message: string }) => void);
  onServerAssignedData?: ((x: ServerAssignedData) => void);
  onClientPresenceChanged?: ((c: ClientPresenceChangedArgs) => void);
  onRooms?: ((x: OnRoomsArgs) => void);
  onConnectInfo?: ((c: ConnectInfo) => void);
  onLatency?: (l: Latency) => void;
  // Fakes a connection so that the pieClient API can be used
  // with a single user that echos messages back to itself.
  soloMode: boolean;
  useStats: boolean;
  // promiseCBs is useful for storing promise callbacks (resolve, reject)
  // that need to be invoked in a different place than where they were created.
  // Since PieClient does a lot of asyncronous work through websockets, a 
  // promise that was created with the sending of one message
  // over a websocket must be able to be resolved by the reception of another
  // message over a websocket. promiseCBs fascilitates this pattern.
  promiseCBs: {
    joinRoom?: { resolve: (x: any) => void, reject: (x: any) => void };
  };
  currentRoomInfo?: Room;
  statusElement: HTMLElement | null;
  ws?: WebSocket;
  stats: {
    latency: Latency;
  };
  currentClientId: string;
  reconnectTimeoutId?: ReturnType<typeof setTimeout>;
  reconnectAttempts: number;

  constructor({ env = 'development' }) {
    console.log(`Pie: WebSocketPie Client v${version} ${env}`);
    this.env = env;
    this.onError = console.error;
    this.soloMode = false;
    this.reconnectAttempts = 0;
    this.promiseCBs = {
      joinRoom: undefined,
    };
    this.useStats = false;
    this.currentClientId = '';
    // Optionally support a connection status element
    this.statusElement = document.querySelector('#websocket-pie-connection-status');
    if (this.statusElement) {
      this.statusElement = this.statusElement as HTMLElement;
      this.statusElement.style['pointerEvents'] = 'none';
      this.statusElement.style['position'] = 'absolute';
      this.statusElement.style['top'] = '10px';
      this.statusElement.style['left'] = '10px';
      this.statusElement.style['userSelect'] = 'none';
    }
    this.stats = {
      latency: {
        min: Number.MAX_SAFE_INTEGER,
        max: 0,
        averageDataPoints: [],
        average: NaN,
      },
    };
  }
  // See https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
  isConnected(): boolean {
    return this.soloMode || !!this.ws && this.ws.readyState == this.ws.OPEN;

  }
  async connect(wsUrl: string, useStats: boolean): Promise<void> {
    // Only connect if there is no this.ws object or if the current this.ws socket is CLOSED
    if (this.ws && this.ws.readyState !== this.ws.CLOSED) {
      console.error('Pie: pie-client: Cannot create a new connection.  Please fully close the existing connection before attempting to open a new one');
      return
    }
    this.soloMode = false;
    this.useStats = useStats;
    console.log(`Pie: pie-client: connecting to ${wsUrl}...`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this._updateDebugInfo();
      this.ws.onmessage = event => {
        try {
          const message: any = JSON.parse(event.data);
          // Disregard messages from self, since they are returned to the self client immediately
          // to prevent input lag
          if (message.fromClient !== this.currentClientId) {
            this.handleMessage(message, useStats);
          }
        } catch (e: any) {
          console.error(e);
          if (this.onError) {
            this.onError(e);
          }
        }
      };
      this.ws.onopen = () => {
        console.log(`Pie: pie-client: connected!`);
        this._updateDebugInfo();
        // If client is accepting the onConnectInfo callback,
        // send the message to it
        if (this.onConnectInfo) {
          this.onConnectInfo({
            type: MessageType.ConnectInfo,
            connected: this.isConnected(),
            msg: `Opened connection to ${this.ws && this.ws.url}`,
          });
        }
        if (this.currentRoomInfo) {
          console.log("Pie: Rejoining room", this.currentRoomInfo)
          this.joinRoom(this.currentRoomInfo, true)
        }
        // Reset reconnect attempts now that the connection is successfully opened
        this.reconnectAttempts = 0;
        if (this.ws) {
          this.ws.addEventListener('close', this.tryReconnect);
        }
        resolve();
      };
      this.ws.onerror = err => {
        console.error('pie-client error:', err);
        // There may be other errors than just one during
        // connection attempt but in the event that 
        // the error occurs during the connection attempt
        // it will reject the connection promise
        reject();
      }
      // Always invoke this.onClose() when the socket is closed
      this.ws.addEventListener('close', this.onClose);
    });
  }
  async connectSolo() {
    // Disconnect if currently connected so we can fake a singleplayer connection
    await this.disconnect();
    this.soloMode = true;
    this.ws = undefined;
    if (this.onConnectInfo) {
      this.onConnectInfo({
        type: MessageType.ConnectInfo,
        connected: this.isConnected(),
        msg: `"Connected" in solo mode`,
      });
    }
    this._updateDebugInfo();
    const clientFakeId = 1;
    // Fake serverAssignedData
    this.handleMessage({
      type: MessageType.ServerAssignedData,
      clientId: clientFakeId,
      serverVersion: `no server - client is in solomode`,
    }, false);
    // Fake clientPresenceChanged
    this.handleMessage({
      clients: [clientFakeId],
      clientThatChanged: clientFakeId,
      time: Date.now(),
      type: MessageType.ClientPresenceChanged,
      present: true,
    }, false);
  }
  onClose = () => {
    console.log(`Pie: pie-client: connection closed.`);
    this._updateDebugInfo();
    // If client is accepting the onConnectInfo callback,
    // send the message to it
    if (this.onConnectInfo) {
      this.onConnectInfo({
        type: MessageType.ConnectInfo,
        connected: this.isConnected(),
        msg: `Connection to ${this.ws && this.ws.url} closed.`,
      });
    }

  }
  tryReconnect = () => {
    // Try reconnect
    clearTimeout(this.reconnectTimeoutId);
    const tryReconnectAgainInMillis = 100 + Math.pow(this.reconnectAttempts, 2) * 50;
    console.log(
      `Pie: pie-client: Reconnect attempt ${this.reconnectAttempts +
      1}; will try to reconnect automatically in ${tryReconnectAgainInMillis} milliseconds.`,
    );
    this.reconnectTimeoutId = setTimeout(() => {
      if (this.ws && this.ws.url) {
        this.connect(this.ws.url, this.useStats);
      } else {
        console.error('Cannot attempt to reconnect, this.ws has no url');
      }
    }, tryReconnectAgainInMillis);
    // Increment reconenctAttempts since successful connect
    this.reconnectAttempts++;

  }
  async disconnect(): Promise<void> {
    console.log('Pie: pie-client: Disconnecting...');
    return new Promise<void>(resolve => {
      if (this.soloMode) {
        this.soloMode = false;
        resolve();
        return
      }
      if (!this.ws || this.ws.readyState == this.ws.CLOSED) {
        // Resolve immediately, client is already not connected 
        resolve();
        return
      } else {
        // Do NOT try to reconnect after close since we are
        // intentionally closing the socket
        this.ws.removeEventListener('close', this.tryReconnect);
        // Resolve this promise when the connection is finally closed
        this.ws.addEventListener('close', () => {
          resolve();
        });
        // Close the connection
        this.ws.close();
        // Updates debug info to show that it is closing
        this._updateDebugInfo();
      }
    }).then(() => {
      // Updates debug info to show that it is closed
      this._updateDebugInfo();
      console.log('Pie: pie-client: Successfully disconnected.');
    });

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
        if (this.onData) {
          this.onData(message);
        }
        break;
      case MessageType.ResolvePromise:
        const funcNameForResolve = message.func as keyof typeof this.promiseCBs;
        const promiseCbRes = this.promiseCBs[funcNameForResolve];
        if (promiseCbRes) {
          promiseCbRes.resolve(message.data);
        }
        break;
      case MessageType.RejectPromise:
        const funcNameForReject = message.func as keyof typeof this.promiseCBs;
        const promiseCbRej = this.promiseCBs[funcNameForReject];
        if (promiseCbRej) {
          promiseCbRej.reject(message.err);
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
        if (this.onError) {
          this.onError(message);
        }
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
    if (this.isConnected()) {
      // Cancel previous makeRoom promise if it exists
      // @ts-ignore
      if (this.promiseCBs[MessageType.JoinRoom]) {
        // @ts-ignore
        this.promiseCBs[MessageType.JoinRoom].reject({ message: `Cancelled due to newer ${MessageType.JoinRoom} request` });
      }
      return new Promise((resolve, reject) => {
        // Assign callbacks so that the response from the server can
        // fulfill this promise
        // @ts-ignore
        this.promiseCBs[MessageType.JoinRoom] = { resolve, reject };
        if (this.ws) {
          this.ws.send(
            JSON.stringify({
              type: MessageType.JoinRoom,
              roomInfo,
              makeRoomIfNonExistant
            }),
          );
        }
        if (this.isConnected() && this.ws === undefined) {
          // solo mode, resolve immediately
          resolve(roomInfo)
        }

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
    if (this.isConnected() && this.ws) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.LeaveRoom,
        }),
      );
      this.currentRoomInfo = undefined;
    } else {
      if (this.onError) {
        this.onError({ message: `Cannot leave room, not currently connected to web socket server` });
      }
    }
  }
  getRooms(roomInfo: any) {
    if (this.isConnected() && this.ws) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.GetRooms,
          roomInfo,
        }),
      );
    } else {
      if (this.onError) {
        this.onError({ message: `Cannot get rooms, not currently connected to web socket server` });
      }
    }
  }
  sendData(payload: any, extras?: any) {
    if (this.isConnected()) {
      const message = {
        type: MessageType.Data,
        payload,
        ...extras,
      };
      if (this.ws !== undefined) {
        this.ws.send(JSON.stringify(message));
      }
      if (!extras || extras.subType === undefined) {
        // Handle own message immediately to reduce lag
        // Only handle own message immediately if there is no subtype.  Otherwise it
        // would process Whisper or Together messages immediately which it shouldn't.
        this.handleMessage({ fromClient: this.currentClientId, ...message }, false);
      }
    } else {
      if (this.onError) {
        this.onError({ message: `Cannot send data to room, not currently connected to web socket server` });
      }
    }
  }
  _updateDebugInfo(message?: { clients: object[] }) {
    try {
      if (this.statusElement) {
        if (this.ws && this.ws.readyState == this.ws.CONNECTING) {
          this.statusElement.innerHTML = `⬤ Connecting...`;
        } else if (this.isConnected()) {
          if (this.soloMode) {
            this.statusElement.innerHTML = `⬤ Connected in solo mode`;
          } else if (this.ws && this.ws.readyState == this.ws.OPEN) {
            const numberOfClients = (message && message.clients && message.clients.length) || 1;
            this.statusElement.innerHTML = `⬤ ${numberOfClients == 1 ? `${numberOfClients} User` : `${numberOfClients} Users`
              } Connected`;
          }
        } else if (this.ws && this.ws.readyState == this.ws.CLOSED) {
          this.statusElement.innerHTML = `⬤ Disconnected`;
        } else if (this.ws && this.ws.readyState == this.ws.CLOSING) {
          this.statusElement.innerHTML = `⬤ Disconnecting...`;
        } else {
          this.statusElement.innerHTML = `⬤ Not Connected`;
        }
        this.statusElement.style.color = this.soloMode || (this.ws && (this.ws.readyState == this.ws.OPEN || this.ws.readyState == this.ws.CONNECTING)) ? 'green' : 'red';
      }
    } catch (e) {
      console.error(e);
    }
  }
}

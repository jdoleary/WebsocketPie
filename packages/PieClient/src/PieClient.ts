import { MessageType } from './enums';
import { log, logError } from './log';
import { version } from '../package.json';
export interface ConnectInfo {
  type: string;
  connected: boolean;
  msg: string;
}
export interface ServerAssignedData {
  type: string;
  clientId: string;
  // The @websocketpie/server version
  serverVersion: string;
  // The version of the hostApp software optionally running on websocketpie
  hostAppVersion: string;
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
  time: number;
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
  // onData: a callback that is invoked when data is recieved from PieServer
  onData?: (x: OnDataArgs) => void;
  onError?: ((x: { message: string }) => void);
  // onServerAssignedData: a callback that is invoked with the user's client data that is assigned when
  // connecting to a PieServer
  onServerAssignedData?: ((x: ServerAssignedData) => void);
  // onClientPresenceChanged: is invoked when a client joins or leaves a room that
  // the current client is connected to
  onClientPresenceChanged?: ((c: ClientPresenceChangedArgs) => void);
  onRooms?: ((x: OnRoomsArgs) => void);
  onConnectInfo?: ((c: ConnectInfo) => void);
  // onLatency receives latency information if useStats is
  // set to true
  onLatency?: (l: Latency) => void;
  // a flag to determine if latency stats should be recorded
  // Results are sent to the onLatency callback
  useStats: boolean;
  // soloMode fakes a connection so that the pieClient API can be used
  // with a single user that echos messages back to itself.
  soloMode: boolean;
  // promiseCBs is useful for storing promise callbacks (resolve, reject)
  // that need to be invoked in a different place than where they were created.
  // Since PieClient does a lot of asyncronous work through websockets, a 
  // promise that was created with the sending of one message
  // over a websocket must be able to be resolved by the reception of another
  // message over a websocket. promiseCBs fascilitates this pattern.
  promiseCBs: {
    joinRoom?: { resolve: (x: any) => void, reject: (x: any) => void };
  };
  // Stores information of the current room to support automatic re-joining
  currentRoomInfo?: Room;
  // an optional HTMLElement that is automatically updated with the connection status
  statusElement: HTMLElement | null;
  // the websocket instance that is used to communicate with PieServer
  ws?: WebSocket;
  stats: {
    latency: Latency;
  };
  // the server-assigned id of the current client
  clientId: string;
  // a setTimeout id used to try to reconnect after accidental disconnection
  // with a built in falloff
  reconnectTimeoutId?: ReturnType<typeof setTimeout>;
  // a timeout to check if the server sends a 'ping' message
  heartbeatTimeout?: ReturnType<typeof setTimeout>;
  // The number of reconnect attempts since successful connection
  reconnectAttempts: number;

  constructor() {
    log(`WebSocketPie Client v${version}`);
    this.onError = logError;
    this.soloMode = false;
    this.reconnectAttempts = 0;
    this.promiseCBs = {
      joinRoom: undefined,
    };
    this.useStats = false;
    this.clientId = '';
    // Optionally support a connection status element
    this.statusElement = document.getElementById('websocketpie-connection-status');
    if (this.statusElement) {
      this.statusElement = this.statusElement as HTMLElement;
      this.statusElement.style['pointerEvents'] = 'none';
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

    window.addEventListener('online', () => {
      log('Network online');
      this._updateDebugInfo();
    });
    window.addEventListener('offline', () => {
      log('Network offline');
      this._updateDebugInfo();
      // Note, is is important to NOT close the websocket connection here,
      // because if the connection comes back on line, the connection will
      // automatically resume sending and receiving messages (This is built 
      // in to the WebsocketAPI)
    });

  }
  // See https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
  isConnected(): boolean {
    return this.soloMode
      || window.navigator.onLine && !!this.ws && this.ws.readyState == this.ws.OPEN;
  }
  // heartbeat is used to determine on the client-side if the client is unaware that 
  // it is disconnected from the server.
  // When invoked, it will wait a specified amount of time and if the heartbeatTimeout
  // is not canceled it will report that latency is too high.
  heartbeat() {
    if (this.soloMode) {
      // Do not run heartbeat checks in soloMode because there is no server in
      // solomode and it would always cause the heartbeat error to log.
      return;
    }
    // Clear any previous heartbeatTimeout
    clearTimeout(this.heartbeatTimeout);

    // Delay should be equal to the interval at which your server
    // sends out pings plus a conservative assumption of the latency.
    const waitForResponseMs = 5000;
    // Set a timeout that will be cleared when the next message from own client is recieved.
    this.heartbeatTimeout = setTimeout(() => {
      const errorMsg = `Latency for own message echoed back from server exceeded threshold of ${waitForResponseMs} milliseconds.`;
      logError(errorMsg);
      if (this.onError) {
        this.onError({ message: errorMsg });
      }
      // Why Commented Out: We __could__ close the websocket here, but for now I'm choosing just to report the error
      // if (this.ws) {
      //   this.ws.close();
      // }
    }, waitForResponseMs);
  }
  async connect(wsUrl: string, useStats: boolean): Promise<void> {
    // Only connect if there is no this.ws object or if the current this.ws socket is CLOSED
    if (this.ws && this.ws.readyState !== this.ws.CLOSED) {
      log(`Disconnecting from current connection at ${this.ws.url} so that new connection to ${wsUrl} can be made...`)
      await this.disconnect();
    }
    this.soloMode = false;
    this.useStats = useStats;
    const { clientId: clientIdFromQueryString } = parseQueryString(wsUrl);
    if (clientIdFromQueryString) {
      this.clientId = clientIdFromQueryString;
    }
    const url = new URL(wsUrl);
    // Clear url querystring
    url.search = '';

    log(`Connecting to ${url.toString()} ${this.clientId ? `with clientId: ${this.clientId}` : ''}...`);

    return new Promise((resolve, reject) => {
      // Passing optional cliendId into the WebSocket constructor will tell PieServer
      // that this client requests to join with that ID and it will save the whole
      // url in this.ws.url so that reconnection attempts use the clientId
      this.ws = new WebSocket(url.toString() + (this.clientId ? `?clientId=${this.clientId}` : ''));
      this._updateDebugInfo();
      this.ws.onmessage = event => {
        try {
          const message: any = JSON.parse(event.data);
          // Disregard messages from self, since they are returned to the self client immediately
          // to prevent input lag
          if (message.fromClient == this.clientId) {
            // Message from self
            // Clear the heartbeatTimeout because this client has recieved 
            // its own message back from the pieServer
            clearTimeout(this.heartbeatTimeout);
            // Do not pass messages from self to this.handleMessage
            // because messages from self are handled immediately to reduce
            // appearance of latency from the server
          } else {
            // If the message is not from self, pass it along to this.handleMessage
            this.handleMessage(message, useStats);
          }
        } catch (e: any) {
          logError(e);
          if (this.onError) {
            this.onError(e);
          }
        }
      };
      this.ws.onopen = () => {
        log(`connected!`);
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
          log("Rejoining room", this.currentRoomInfo)
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
        logError(err);
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
    const clientFakeId = 'solomode_client_id';
    // Fake serverAssignedData
    this.handleMessage({
      type: MessageType.ServerAssignedData,
      clientId: clientFakeId,
      serverVersion: `no server - client is in solomode`,
    }, false);
    // Fake clientPresenceChanged
    this.handleMessage({
      clients: [clientFakeId],
      time: Date.now(),
      type: MessageType.ClientPresenceChanged,
      present: true,
    }, false);
  }
  onClose = () => {
    log(`Connection closed.`);
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
    const maxTimeoutMillis = 10000;
    // Reconnect timeout with falloff based on number of reconnectAttempts with a maximum timeout
    const tryReconnectAgainInMillis = Math.min(maxTimeoutMillis, 100 + Math.pow(this.reconnectAttempts, 2) * 50);
    log(
      `Reconnect attempt ${this.reconnectAttempts +
      1}; will try to reconnect automatically in ${tryReconnectAgainInMillis} milliseconds.`,
    );
    const updateFalloffMessage = (millis: number) => {
      if (this.statusElement) {
        this.statusElement.innerHTML = `⬤ Reattempting connection in ${(millis / 1000).toFixed(1)} seconds...`;
      }
    }
    updateFalloffMessage(tryReconnectAgainInMillis);
    // Update statusElement every 1/10th second
    for (let i = 0; i < tryReconnectAgainInMillis / 100; i++) {
      setTimeout(() => {
        updateFalloffMessage((tryReconnectAgainInMillis / 100 - i) * 100);
      }, i * 100)
    }
    this.reconnectTimeoutId = setTimeout(() => {
      if (this.ws && this.ws.url) {
        // Strip any search params from the current url
        const { origin: url } = new URL(this.ws.url)
        this.connect(url, this.useStats).catch(() => {
          log('Failed to reconnect');
          // Try again to reconnect
          this.tryReconnect();
        });
      } else {
        logError('Cannot attempt to reconnect, this.ws has no url');
      }
    }, tryReconnectAgainInMillis);
    // Increment reconenctAttempts since successful connect
    this.reconnectAttempts++;

  }
  async disconnect(): Promise<void> {
    // It is important to leave current room before disconnecting so that
    // currentRoomInfo is cleared
    this.leaveRoom();
    return new Promise<void>(resolve => {
      if (this.soloMode) {
        this.soloMode = false;
        resolve();
        log('"Disconnected" from soloMode');
        return
      }
      if (!this.ws || this.ws.readyState == this.ws.CLOSED) {
        // Resolve immediately, client is already not connected 
        log('Attempted to disconnect but there was no preexisting connection to disconnect from.');
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
        log('Disconnecting...');
        // Close the connection
        this.ws.close();
        // Updates debug info to show that it is closing
        this._updateDebugInfo();
        log('Disconnected.');
      }
    }).then(() => {
      // Updates debug info to show that it is closed
      this._updateDebugInfo();
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
        this.clientId = message.clientId;
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
        logError(message);
        if (this.onError) {
          this.onError(message);
        }
        break;
      default:
        log(message);
        logError(`Above message of type ${message.type} not recognized!`);
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
        if (this.soloMode) {
          // if in soloMode, resolve immediately
          resolve(roomInfo)
        }

      }).then((currentRoomInfo: any) => {
        if (typeof currentRoomInfo.app === 'string' && typeof currentRoomInfo.name === 'string' && typeof currentRoomInfo.version === 'string') {
          log(`${MessageType.JoinRoom} successful with`, currentRoomInfo);
          // Save roomInfo to allow auto rejoining should the server restart
          this.currentRoomInfo = currentRoomInfo;
        } else {
          logError("joinRoom succeeded but currentRoomInfo is maleformed:", currentRoomInfo);
        }
      });
    } else {
      return Promise.reject({ message: `${MessageType.JoinRoom} failed, not currently connected to web socket server` });
    }
  }
  leaveRoom() {
    // Clear currentRoomInfo even if pie is connected in soloMode
    this.currentRoomInfo = undefined;
    if (this.soloMode) {
      // Clear clientId if exiting a room in soloMode
      // Note: The clientId will be retained in actual multiplayer
      // so that a client can rejoin a server if they wish
      this.clientId = '';
    }
    if (this.isConnected() && this.ws) {
      this.ws.send(
        JSON.stringify({
          type: MessageType.LeaveRoom,
        }),
      );
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
        // Since this client has just sent a message, queue a heartbeat
        // to ensure that it will report an error if the message isn't
        // echoed back after a reasonable amount of time.
        // note: Heartbeat should only be run on messages without a subType
        // because normal messages are expected to be echoed back to the sender immediatly
        // where messages with a subType get special handling and may not come back at all
        // or will come back intentionally with a delay
        this.heartbeat();
        // Handle own message immediately to reduce lag
        // Only handle own message immediately if there is no subtype.  Otherwise it
        // would process Whisper or Together messages immediately which it shouldn't.
        // --
        // Note: Since clients handle their own data immediately, it won't have
        // serverAssignedData attached, such as `time`
        this.handleMessage({ fromClient: this.clientId, ...message }, false);
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
        this.statusElement.style.color = this.soloMode || (this.ws && this.ws.readyState == this.ws.OPEN) ? 'green' : this.ws && this.ws.readyState == this.ws.CONNECTING ? 'rgb(255,108,0)' : 'red';
      }
    } catch (e) {
      logError(e);
    }
  }
}

type QueryStringObject = { [key: string]: string };
function parseQueryString(url: string): QueryStringObject {
  return new URL(url).search
    .split('?')
    .join('')
    .split('&')
    .reduce((ob: QueryStringObject, pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        ob[key] = value;
      }
      return ob;
    }, {});
}
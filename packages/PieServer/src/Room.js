const chalk = require('chalk');
const log = require('./log');
const { MessageType } = require('./enums');

class Room {
  constructor({ app, name = 'default', version, maxClients, togetherTimeoutMs, hidden, password }, hostApp = undefined) {
    this.hostApp = hostApp;
    if (this.hostApp) {
      // Override hostApp.sendData so that it can sendData to the room
      this.hostApp.sendData = payload => this.emit({ type: MessageType.Data, payload });
    }
    this.app = app;
    this.clients = [];
    this.name = name;
    this.version = version;
    // The maximum amount of clients allowed in the room
    this.maxClients = maxClients;
    this.togetherTimeoutMs = togetherTimeoutMs;
    // Holds groups of messaged queued to be sent all at once
    this.togetherMessageGroups = {};
    // Holds the timeouts that can send a together message group before
    // all clients have submitted a together message
    this.togetherTimeouts = {};
    // If a room should be visible to anyone who queries the rooms
    this.hidden = hidden;
    // If all clients leave a room, the room is marked for clean up and if no clients rejoin by the time
    // the timeout triggers, the room will be cleaned up.
    this.cleanupTimeoutId;
    this.password = (password === '' || password === null) ? undefined : password;
  }
  toString() {
    return `${this.app};${this.name};${this.version}`
  }
  cleanup() {
    if (this.hostApp && this.hostApp.cleanup) {
      this.hostApp.cleanup();
    }
  }

  serialize() {
    const { app, name, version, maxClients, togetherTimeoutMs, hidden, password } = this;
    return {
      app,
      name,
      version,
      maxClients,
      togetherTimeoutMs,
      hidden,
      // Take Note: password is returned when serialized
      password
    };
  }

  echoTogetherMessage(togetherId) {
    clearTimeout(this.togetherTimeouts[togetherId]);
    const togetherMessageGroup = this.togetherMessageGroups[togetherId];
    if (togetherMessageGroup) {
      const currentTime = new Date();
      // Echo all the together messages in the group
      for (let message of togetherMessageGroup) {
        // Override the time so that the together messages all have the same timestamp
        message.time = currentTime;
        this.emit(message);
      }
      // Remove the together group because the group of messages has now been echoed
      delete this.togetherMessageGroups[togetherId];
    } else {
      log(
        chalk.yellow(`Together group ${togetherId} does not exist and cannot be echoed.  It must've already been sent`),
      );
    }
  }

  queueTogetherMessage(message) {
    const { togetherId } = message;
    // Allow indexing by 'undefined' if the client app choses not to supply a togetherId
    // this is how the togetherId is optional
    if (!this.togetherMessageGroups[togetherId]) {
      this.togetherMessageGroups[togetherId] = [];
      // After an optional timeout, echo the group of together messages
      // regarless if all of the clients have queued their together message
      if (this.togetherTimeoutMs) {
        const timeoutId = setTimeout(() => {
          this.echoTogetherMessage(togetherId);
        }, this.togetherTimeoutMs);
        this.togetherTimeouts[togetherId] = timeoutId;
      }
    }
    const preexistingIndex = this.togetherMessageGroups[togetherId].findIndex(m => m.fromClient === message.fromClient);
    if (preexistingIndex !== -1) {
      // Client sent message already, overwrite with the new message
      this.togetherMessageGroups[togetherId][preexistingIndex] = message;
    } else {
      // Add the message to the list
      this.togetherMessageGroups[togetherId].push(message);
    }
    // If all room's clients have added their message send the group of messages
    if (this.togetherMessageGroups[togetherId].length === this.clients.length) {
      this.echoTogetherMessage(togetherId);
    }
  }

  emit(data) {
    if (this.hostApp) {
      try {
        this.hostApp.handleMessage(data);
      } catch (e) {
        console.log('Caught error from hostApp.handleMessage', data);
        console.error(e);
        this.clients.forEach(c =>
          c.send(
            JSON.stringify({
              type: MessageType.Err,
              message: `hostApp.handleMessage error: ${err.message}`
            })
          )
        );
      }
    }
    this.clients.forEach(c => c.send(JSON.stringify(data)));
  }

  // Emit data to only clients with specific ids
  whisper(data, ids) {
    const selectClients = this.clients.filter(c => ids.indexOf(c.id) !== -1);
    selectClients.forEach(c => c.send(JSON.stringify(data)));
  }

  getClientIndex(client) {
    return this.clients.findIndex(c => c.id === client.id);
  }

  getClientsSafeToEmit() {
    return this.clients.map(c => c.id);
  }

  // For internal use only
  _clientPresenceChanged() {
    this.emit({
      clients: this.getClientsSafeToEmit(),
      time: Date.now(),
      type: MessageType.ClientPresenceChanged,
    });
  }

  addClient(client) {
    const clientIndex = this.getClientIndex(client);
    if (clientIndex !== -1) {
      throw new Error('Cannot readd client to room; the client is already in the room');
    }
    if (this.maxClients !== undefined && this.clients.length === this.maxClients) {
      throw new Error(`Room is at capacity and cannot accept more clients due to the room's chosen settings`);
    }
    this.clients.push(client);
    this._clientPresenceChanged();
  }

  removeClient(client) {
    const clientIndex = this.getClientIndex(client);
    if (clientIndex === -1) {
      log(chalk.yellow(`WARN: Cannot remove client, client is not in the room.`));
      return;
    }
    this.clients.splice(clientIndex, 1);
    this._clientPresenceChanged();
  }
}

module.exports = Room;

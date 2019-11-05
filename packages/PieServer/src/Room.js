const chalk = require('chalk');
const log = require('./log');
const { MessageType } = require('./enums');

class Room {
  constructor({ app, name, version, maxClients, togetherTimeoutMs }) {
    this.app = app;
    this.clients = [];
    this.name = name;
    this.version = version;
    // The maximum amount of clients allowed in the room
    this.maxClients = maxClients;
    this.togetherTimeoutMs = togetherTimeoutMs;
    // Holds groups of messaged queued to be sent all at once
    this.togetherMessages = {};
    // Holds the timeouts that can send a together message group before
    // all clients have submitted a together message
    this.togetherTimeouts = {};
  }

  echoTogetherMessage(togetherId) {
    const togetherGroup = this.togetherMessages[togetherId];
    clearTimeout(this.togetherTimeouts[togetherId]);
    if (togetherGroup) {
      const currentTime = new Date();
      // Echo all the together messages in the group
      for (let message of togetherGroup) {
        // Override the time so that the together messages all have the same timestamp
        message.time = currentTime;
        this.emit(message);
      }
      // Remove the together group because the group of messages has now been echoed
      delete this.togetherMessages[togetherId];
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
    if (!this.togetherMessages[togetherId]) {
      this.togetherMessages[togetherId] = [];
      // After an optional timeout, echo the group of together messages
      // regarless if all of the clients have queued their together message
      if (this.togetherTimeoutMs) {
        const timeoutId = setTimeout(() => {
          this.echoTogetherMessage(togetherId);
        }, this.togetherTimeoutMs);
        this.togetherTimeouts[togetherId] = timeoutId;
      }
    }
    // Add the message to the list
    this.togetherMessages[togetherId].push(message);
    // If all room's clients have added their message send the group of messages
    if (this.togetherMessages[togetherId].length === this.clients.length) {
      this.echoTogetherMessage(togetherId);
    }
  }

  emit(data) {
    this.clients.forEach(c => c.send(JSON.stringify(data)));
  }

  getClientIndex(client) {
    return this.clients.findIndex(c => c.id === client.id);
  }

  getClientsSafeToEmit() {
    return this.clients.map(c => c.id);
  }

  // For internal use only
  _clientPresenceChanged(client, present) {
    this.emit({
      clients: this.getClientsSafeToEmit(),
      clientThatChanged: client.id,
      time: Date.now(),
      type: MessageType.ClientPresenceChanged,
      present,
    });
  }

  addClient(client) {
    const clientIndex = this.getClientIndex(client);
    if (clientIndex !== -1) {
      throw new Error('Cannot add client, client is already in the room');
    }
    if (this.maxClients !== undefined && this.clients.length === this.maxClients) {
      throw new Error(`Room is at capacity and cannot accept more clients due to the room's chosen settings`);
    }
    this.clients.push(client);
    this._clientPresenceChanged(client, true);
  }

  removeClient(client) {
    const clientIndex = this.getClientIndex(client);
    if (clientIndex === -1) {
      log(chalk.yellow(`WARN: Cannot remove client, client is not in the room.`));
      return;
    }
    this.clients.splice(clientIndex, 1);
    this._clientPresenceChanged(client, false);
  }
}

module.exports = Room;

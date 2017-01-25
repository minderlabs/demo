//
// Copyright 2017 Minder Labs.
//

import { TypeUtil } from 'minder-core';

// TODO(burdon): Move to util.
// TODO(burdon): Sub interface into base (test with simple button in existing panel).

/**
 * http://dev.apollodata.com/core/network.html#custom-network-interface
 */
export class ChromeNetworkInterface {

  static CHANNEL = 'apollo';

  constructor(channel) {
    console.assert(channel);
    this._name = channel;
  }

  init() {
    // TODO(burdon): Config re-connect.
    this._name.connect();
    return this;
  }

  /**
   * Proxy request through the message sender.
   *
   * @param {GraphQLRequest} request
   * @return {Promise<GraphQLResult>}
   */
  query(request) {
    return this._name.postMessage({
      data: request
    }).wait().then(response => {
      return response.data;
    });
  }
}

/*
let sender = new ChromeMessageSender();
let apolloChannel = new ChromeMessageChannel('apollo', sender);
let systemChannel = new ChromeMessageChannel('system', sender).listen(message => {});

let receiver = new ChromeMessageReceiver();
let apolloReceiver = new ChromeMessageRouter('apollo', receiver).listen(message => {
  message.respond();
});
*/

//-----------------------------------------------------------------------------
// Sender and Receiver.
//-----------------------------------------------------------------------------

/**
 * Simple Chrome Message Sender.
 *
 * https://developer.chrome.com/extensions/messaging
 */
export class ChromeMessageSender {

  // TODO(burdon): Do quick test first then look at framework for learnings (e.g., reconnect).

  /**
   * @param {string} name Client name.
   */
  constructor(name=undefined) {
    this._name = name || 'Client-' + new Date().getTime();  // TODO(burdon): Random.

    // Connected port.
    this._port = null;
  }

  /**
   * Connects and listens for inbound messages.
   * @param {Function} onMessage
   * @return {ChromeMessageSender}
   */
  connect(onMessage=undefined) {

    // https://developer.chrome.com/extensions/messaging#connect
    // https://developer.chrome.com/extensions/runtime#method-connect
    this._port = chrome.runtime.connect({ name: this._name });

    // TODO(burdon): Reconcile blocking senders (by message ID).
    // Handle messages.
    this._port.onMessage.addListener((message) => {
      console.log('Received: ' + JSON.stringify(message));
      message && onMessage(message);
    });

    // TODO(burdon): Handle disconnect.
    return this;
  }

  /**
   * Posts the message.
   * @param {object} data
   * @param {object} header
   * @return {string} Message ID.
   */
  postMessage(data, header=undefined) {
    // TODO(burdon): Promise?
    if (!this._port) {
      this.connect();
    }

    header = _.merge({}, header, {
      id: id = _.uniqueId('M-')
    });

    let message = { header, data };
    console.log('Sending: ' + JSON.stringify(message));
    this._port.postMessage(message);
    return header;
  }
}

/**
 * Simple Chrome Message Receiver.
 *
 * https://developer.chrome.com/extensions/messaging
 */
export class ChromeMessageReceiver {

  constructor() {

    // Map of active ports indexed by name.
    this._ports = new Map();
  }

  /**
   * Listens for inbound messages.
   * @param {Function} onMessage
   * @return {ChromeMessageReceiver}
   */
  listen(onMessage) {
    // TODO(burdon): Assert only called once.
    console.assert(onMessage);

    // https://developer.chrome.com/extensions/runtime#event-onMessage
    chrome.runtime.onConnect.addListener((port) => {
      console.log('Connected[%d]: ', this._ports.size, port.name);
      this._ports.set(port.name, port);

      // Handle messages.
      port.onMessage.addListener((message) => {
        console.log('Received: ' + JSON.stringify(message));
        let { header, data } = message;
        omMessage(port.name, data, header);
      });

      // TODO(burdon): Retry back-off.
      // https://developer.chrome.com/extensions/runtime#type-Port
      chrome.runtime.onDisconnect.addListener(() => {
        this._ports.delete(port.name);
      });
    });

    return this;
  }

  /**
   * Posts messages to the given client.
   * @param {string} client
   * @param {object} data
   * @param {object} header
   * @return {boolean}
   */
  postMessage(client, data, header=undefined) {
    let port = this._ports.get(client);
    if (port) {
      header = header || {};
      let message = { header, data };
      console.log('Sending: ' + JSON.stringify(message));
      port.sendMessage(message);
      return true;
    } else {
      console.warning('Client not connected: ' + client);
      return false;
    }
  }

  // TODO(burdon): Broadcast.
}

//-----------------------------------------------------------------------------
// Channels.
//-----------------------------------------------------------------------------

/**
 * Multiplexes ChromeMessageSender for multiple instance of ChromeMessageChannel.
 */
export class ChromeMessageChannelRouter {

  constructor() {

    // Message sender.
    this._sender = new ChromeMessageSender();

    // Map of channel callbacks indexed by name.
    this._channels = new Map();
  }

  get sender() {
    return this._sender;
  }

  listen(name, callback) {
    console.assert(name && callback);
    this._channels.set(name, callback);
  }

  connect() {
    this._sender.connect(message => {
      let callback = this._channels.get(_.get(message, 'header.channel'));
      callback && callback(message);
    });

    return this;
  }
}

/**
 * ChromeMessageChannel sends and receives messages on a named channel.
 */
export class ChromeMessageChannel {

  /**
   * Creates the named channel.
   * @param {string} name Channel name.
   * @param {ChromeMessageChannelRouter} router
   */
  constructor(name, router) {
    console.assert(name && router);
    this._name = name;
    this._dispatcher = router;

    // Map of pending resolvers by ID.
    this._pending = new Map();

    // Listen for channel messages.
    this._dispatcher.listen(this._name, message => {
      let { id, data } = message.header;
      let resolver = this._pending.get(id);
      if (resolver) {
        resolver(data);
      } else {
        console.warning('Unexpected message: ' + JSON.stringify(message));
      }
    });
  }

  /**
   * Posts messages to the endpoint.
   *
   * Optionally calling wait() on the returned value will return a promise that blocks
   * until the response is received.
   *
   * postMessage({ message: 'hello' }).wait().then(reponse => { console.log(reponse); });
   *
   * @param {object} data
   * @return {object} Message receipt.
   */
  postMessage(data) {
    let header = this._dispatcher.sender.postMessage(data, {
      channel: this._name
    });

    return {
      // TODO(burdon): Stipulate timeout.
      wait: () => {
        return new Promise((resolve, reject) => {
          this._pending.set(header.id, resolve);
        });
      }
    }
  }
}

/**
 * Listens to multiple channels.
 */
export class ChromeMessageChannelDispatcher {

  constructor() {

    // Message receiver.
    this._receiver = new ChromeMessageReceiver().listen((client, request, header) => {
      let listener = this._listeners.get(header.channel);
      if (listener) {
        let result = listener(request);
        if (result && result.then) {
          // Return result.
          result.then(response => {
            this._receiver.postMessage(client, response, {
              channel: header.channel
            });
          });
        }
      }
    });

    // Map of listeners indexed by channel.
    this._listeners = new Map();
  }

  /**
   * Listens for channel messages.
   *
   * @param {string} channel
   * @param {Function} onMessage Optionally returns a promise yielding the response.
   * @return {ChromeMessageChannelRouter}
   */
  listen(channel, onMessage) {
    console.assert(channel && onMessage);
    this._listeners.set(channel, onMessage);

    return this;
  }

  /**
   * Posts the message to the given client and channel.
   *
   * @param {string} client
   * @param {string} channel
   * @param {object} message
   */
  postMessage(client, channel, message) {
    this._receiver.postMessage(client, message, {
      channel
    });
  }
}

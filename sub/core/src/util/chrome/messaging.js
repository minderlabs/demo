//
// Copyright 2017 Minder Labs.
//

import { TypeUtil } from '../../util/type';
import Logger from '../../util/logger';

const logger = Logger.get('message');

//-----------------------------------------------------------------------------
// Sender and Receiver.
//-----------------------------------------------------------------------------

/**
 * Simple Chrome Message Sender.
 *
 * https://developer.chrome.com/extensions/messaging
 */
export class ChromeMessageSender {

  // Time for CRX to re-install.
  static RELOAD_DELAY = 3000;

  /**
   * @param {string} channel Client name.
   * @param {object} options
   */
  constructor(channel=undefined, options=undefined) {
    this._channel = channel || 'Client-' + new Date().getTime();  // TODO(burdon): Random.
    this._options = options || {
      reconnect: true
    };

    // Connected port.
    this._port = null;
  }

  /**
   * Connects and listens for inbound messages.
   * @param {Function} onMessage
   * @return {ChromeMessageSender}
   */
  connect(onMessage=undefined) {
    logger.info('Connecting: ' + this._channel);

    // https://developer.chrome.com/extensions/messaging#connect
    // https://developer.chrome.com/extensions/runtime#method-connect
    this._port = chrome.runtime.connect({ name: this._channel });

    // Handle messages.
    this._port.onMessage.addListener((message) => {
      logger.log('Received: ' + TypeUtil.stringify(message));
      message && onMessage(message);
    });

    // Handle disconnect and auto-retry.
    this._port.onDisconnect.addListener(() => {
      this._port = null;
      logger.info('Disconnected');

      // TODO(burdon): Listen for BG event onSuspend to flush data.
      // NOTE: Cannot reconnect when CRX is re-installed/updated (so reload).
      // https://groups.google.com/a/chromium.org/forum/#!msg/chromium-extensions/QLC4gNlYjbA/Ay41e2tYAQAJ
      setTimeout(() => {
        // TODO(burdon): Alternatively show RELOAD page (i.e., tell user).
        document.location.reload();
      }, ChromeMessageSender.RELOAD_DELAY);
    });

    return this;
  }

  /**
   * Posts the message.
   * @param {object} data
   * @param {object} header
   * @return {object} Updated header object (i.e., with message ID).
   */
  postMessage(data, header=undefined) {
    if (!this._port) {
      this.connect();
    }

    header = _.merge({}, header, {
      id: _.uniqueId('M-'),
      timestamp: new Date().getTime()
    });

    let message = { header, data };
    logger.log('Sending: ' + TypeUtil.stringify(message));
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
      this._ports.set(port.name, port);
      logger.log(`Connected[${this._ports.size}]: ${port.name}`);

      // Handle messages.
      port.onMessage.addListener((message) => {
        logger.log('Received: ' + TypeUtil.stringify(message));
        let { header, data } = message;
        onMessage(port.name, data, header);
      });

      // TODO(burdon): Retry back-off.
      // https://developer.chrome.com/extensions/runtime#type-Port
      port.onDisconnect.addListener(() => {
        this._ports.delete(port.name);
        logger.log(`Disonnected[${this._ports.size}]: ${port.name}`);
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
      header = _.merge({}, header, {
        timestamp: new Date().getTime()
      });

      let message = { header, data };
      logger.log('Sending: ' + TypeUtil.stringify(message));
      port.postMessage(message);
      return true;
    } else {
      console.warn('Client not connected: ' + client);
      return false;
    }
  }

  // TODO(burdon): Broadcast.
}

//-----------------------------------------------------------------------------
// Channels implement routing between components.
//
// [Channel] \
// [Channel] --> [ChannelRouter] --> [Sender] <---> [Receiver] --> [Dispatcher]
// [Channel] /
//
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

    return this;
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
   * @param {string} channel Channel name.
   * @param {ChromeMessageChannelRouter} router
   */
  constructor(channel, router) {
    console.assert(channel && router);
    this._channel = channel;
    this._router = router;

    // Map of pending resolvers by ID.
    this._pending = new Map();

    // Listen for channel messages.
    this._router.listen(this._channel, message => {
      let { header, data } = message;
      let resolver = this._pending.get(header.id);
      if (resolver) {
        resolver(data);
      } else {
        console.warn('Unexpected message: ' + JSON.stringify(message));
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
    let header = this._router.sender.postMessage(data, {
      channel: this._channel
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
              id: header.id,
              channel: header.channel
            });
          });
        }
      } else {
        // TODO(burdon): Buffer.
        console.warn('No listener for channel: ' + header.channel);
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

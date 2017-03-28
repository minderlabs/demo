//
// Copyright 2016 Minder Labs.
//

/**
 * DOM Utils.
 */
export class DomUtil {

  static isMobile() {
    return !!navigator.userAgent.match(/(Android|iPhone|iPod)/);
  }

  /**
   * @param [{string}] variable length class names (which may be blank).
   * @returns {string} Space separated list of classnames.
   */
  static className() {
    return _.compact(arguments).join(' ');
  }
}

/**
 * Handles window-frame communication.
 */
export class WindowMessenger {

  /**
   * @param {string} channel Identifier for routing.
   * @param {string} origin Match origin of sender.
   */
  constructor(channel, origin=undefined) {
    console.assert(channel);

    // Routing identifier.
    this._channel = channel;

    // Callback.
    this._frame = null;
    this._onMessage = null;

    // TODO(burdon): Only listen for matching frameId!
    // Listen for inbound messages on this window.
    window.addEventListener('message', event => {
      let { data } = event;

      if (origin && origin !== event.origin) {
        return;
      }

      // Since we're listening on the window there may be many posters (e.g., different frames).
      if (data.channel !== this._channel) {
        return;
      }

      this._onMessage && this._onMessage(data.message);
    });
  }

  /**
   * Attaches the given iframe for sending messages.
   * @param frame
   */
  attach(frame) {
    console.assert(frame);
    this._frame = frame;
    return this;
  }

  /**
   * Listens to messages from the parent window.
   * @param onMessage
   */
  listen(onMessage) {
    this._onMessage = onMessage;
    return this;
  }

  /**
   * Sends messages to the parent window.
   * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
   * @param message
   */
  postMessage(message) {
    if (!this._frame) {
      console.warn('Not attached: ' + JSON.stringify(message));
      return;
    }

    // NOTE: '*' could be intercepted by anything else on the page.
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    this._frame.postMessage({
      channel: this._channel,
      message
    }, '*');
  }
}

/**
 * Manages key bindings.
 */
export class KeyListener {

  constructor() {
    // Map of callbacks indexed by spec.
    this._bindings = new Map();

    // Listen for key down events.
    document.addEventListener('keydown', event => {
      this._bindings.forEach((callback, spec) => {

        // Match keys against event.
        if (_.every(_.omit(spec, ['_KEYS_']), (value, key) => event[key] === value)) {
          event.preventDefault();
          callback();
        }
      });
    });
  }

  /**
   * Properties (other than "_KEYS_") should match the keydown event.
   * @param spec
   * @param callback
   * @returns {KeyListener}
   */
  listen(spec, callback) {
    console.assert(spec && callback);
    this._bindings.set(spec, callback);
    return this;
  }
}

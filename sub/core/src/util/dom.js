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
      if (origin && origin != event.origin) {
        return;
      }

      // Since we're listening on the window there may be many posters (e.g., different frames).
      if (event.data.channel != this._channel) {
        return;
      }

      this._onMessage && this._onMessage(event.data.message);
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
  sendMessage(message) {
    console.assert(this._frame);

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
    document.addEventListener('keydown', ev => {
      this._bindings.forEach((callback, spec) => {
        let match = true;
        _.each(spec, (value, key) => {
          if (ev[key] != value) {
            match = false;
            return false;
          }
        });

        match && callback();
      });
    });
  }

  listen(spec, callback) {
    this._bindings.set(spec, callback);
    return this;
  }
}

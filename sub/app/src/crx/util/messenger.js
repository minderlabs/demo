//
// Copyright 2017 Minder Labs.
//

/**
 * Handles inter-frame communication.
 */
export class Messenger {

  /**
   * @param {Object} meta Meta-data passed in message header.
   * @param origin Match origin of sent messages.
   */
  constructor(meta, origin=null) {
    this._meta = meta || {};

    // Callback.
    this._frame = null;
    this._onMessage = null;

    // Listen for inbound messages.
    window.addEventListener('message', event => {
      if (origin && origin != event.origin) {
        return;
      }

      this._onMessage && this._onMessage(event.data.message);
    });
  }

  /**
   * Sends messages to the parent window.
   * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
   * @param message
   */
  sendMessage(message) {
    console.assert(this._frame);

    // TODO(burdon): '*' could be intercepted by anything else on the page.
    // TODO(burdon): Proxy via background page.
    // https://developer.chrome.com/extensions/messaging#external-webpage
    // http://stackoverflow.com/questions/11325415/access-iframe-content-from-a-chromes-extension-content-script

    this._frame.postMessage({
      ...this._meta, message
    }, '*');
  }

  /**
   * Attaches the given window for sending messaged.
   * @param frame
   * @returns {Messenger}
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
}

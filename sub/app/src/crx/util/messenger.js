//
// Copyright 2017 Minder Labs.
//

/**
 * Handles window-frame communication.
 */
export class Messenger {

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

    // TODO(burdon): '*' could be intercepted by anything else on the page.
    // TODO(burdon): Proxy via background page if secure messaging is required.
    // https://developer.chrome.com/extensions/messaging#external-webpage
    // http://stackoverflow.com/questions/11325415/access-iframe-content-from-a-chromes-extension-content-script

    this._frame.postMessage({
      channel: this._channel,
      message
    }, '*');
  }
}

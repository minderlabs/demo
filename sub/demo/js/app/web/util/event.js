//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * Injectable event handler.
 */
export default class EventHandler {

  static init() {
    let eventHandler = new EventHandler();
    window.addEventListener('error', (err) => {
      eventHandler.onError(err);
    });

    return eventHandler;
  }

  constructor() {
    this._callbacks = new Map();
  }

  /**
   * Listen for error events.
   * @param id Unique ID (ensures handlers aren't registered multiple times).
   * @param callback Listener callback.
   * @param type Filter by type.
   */
  listen(id, callback, type=undefined) {
    console.assert(id && callback);
    if (callback) {
      this._callbacks.set(id, {
        type: type,
        callback: callback
      })
    } else {
      this._callbacks.remove(id);
    }
  }

  emit(event) {
    this._callbacks.forEach(config => {
      if (!config.type || config.type === event.type) {
        config.callback(event);
      }
    });
  }
}

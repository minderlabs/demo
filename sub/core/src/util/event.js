//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * Injectable event handler.
 */
export class EventHandler {

  constructor() {
    // Map of callbacks by ID (so can be revoked).
    this._callbacks = new Map();
  }

  /**
   * Listen for events.
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

  /**
   * Send event.
   * @param event
   */
  emit(event) {
    console.log('Event:', JSON.stringify(event));
    this._callbacks.forEach(config => {
      if (!config.type || config.type === event.type) {
        config.callback(event);
      }
    });
  }
}

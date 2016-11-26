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
    this._callbacks = [];
  }

  /**
   * Listen for events.
   * @param type Filter by type (or '*').
   * @param callback Listener callback.
   */
  listen(type, callback) {
    console.assert(type && callback);
    this._callbacks.push({
      type: type,
      callback: callback
    });
    return this;
  }

  /**
   * Send event.
   * @param event
   */
  emit(event) {
    console.assert(event.type);
    console.log('Event:', JSON.stringify(event));
    _.each(this._callbacks, config => {
      if (config.type === '*' || config.type === event.type) {
        config.callback(event);
      }
    });
  }
}

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';


/**
 * Injectable error handler.
 */
export default class ErrorHandler {

  static init() {
    let errorHandler = new ErrorHandler();
    window.addEventListener('error', (err) => {
      errorHandler.onError(err);
    });

    return errorHandler;
  }

  constructor() {
    this._callbacks = new Map();
  }

  /**
   * Listen for error events.
   * @param id Unique ID (ensures handlers aren't registered multiple times).
   * @param callback
   */
  listen(id, callback) {
    if (callback) {
      this._callbacks.set(id, callback)
    } else {
      this._callbacks.remove(id);
    }
  }

  onError(error) {
    this._callbacks.forEach(callback => callback(error));
  }
}

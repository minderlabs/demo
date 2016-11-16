//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * Async utils.
 */
export class Async {

  /**
   * Cancelable timeout function.
   * @param delay
   * @returns {function(*)}
   */
  static timeout = (delay = 500) => {
    let timeout = null;

    /**
     * Invoke the timeout (optionally immediately).
     */
    return (callback, now=false) => {
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        callback()
      }, now ? 0 : delay);
    }
  };
}

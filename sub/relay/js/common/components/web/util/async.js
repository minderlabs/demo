//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * Async utils.
 */
export default class Async {

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

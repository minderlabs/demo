//
// Copyright 2016 Minder Labs.
//

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
     * Returns a functor to the timeout (optionally immediately).
     * If the callback is null, then the timeout is cancelled.
     */
    return (callback, now=false) => {
      timeout && clearTimeout(timeout);
      timeout = null;

      if (callback) {
        timeout = setTimeout(() => {
          timeout = null;
          callback()
        }, now ? 0 : delay);
      }
    }
  };
}

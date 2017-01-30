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

  /**
   * Retry the promise with back-off.
   * @param {Function} promise
   * @param {number} retries
   * @returns {Promise}
   */
  static retry(promise, retries=-1) {
    let attempt = 0;
    let delay = 1000;
    const maxDelay = 60 * 1000;

    const doRetry = () => {
      return new Promise((resolve, reject) => {
        promise(attempt)

          // OK.
          .then(value => {
            resolve(value)
          })

          // Retry.
          .catch(error => {
            if (retries > 0 && attempt >= retries) {
              reject('Max retries: ' + retries);
            } else {
              setTimeout(() => {
                attempt++;
                delay = Math.min(delay * 2, maxDelay);
                return doRetry(promise);
              }, delay);
            }
          });
      });
    };

    return doRetry();
  }
}

/**
 * Event handlers.
 */
export class Listeners {

  constructor() {
    this._listeners = new Set();
  }

  addListener(listener) {
    this._listeners.add(listener);
  }

  fireListeners() {
    let args = arguments;
    this._listeners.forEach(listener => {
      listener.apply(null, args);
    })
  }
}

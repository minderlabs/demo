//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Async utils.
 */
export class Async {

  /**
   * Creates promise for timeout.
   * @param ts
   * @return {Promise}
   */
  static delay(ts) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, ts);
    });
  }

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
   * @param {Function} promise Function to execute returning a promise.
   * @param {number} retries
   * @param {number} delay
   * @param {number} maxDelay
   * @returns {Promise}
   */
  static retry(promise, retries=-1, delay=1000, maxDelay=60*1000) {
    let attempt = 0;

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
                resolve(doRetry(promise));
              }, delay);
            }
          });
      });
    };

    return doRetry();
  }

  /**
   * Iterates the collection sequentially calling the async function for each.
   *
   * NOTE: Iterating an array of promises sequentially doesn't make sense since each promise will be invoked
   * and start execution inside the array.
   *
   * @param collection Data to iterate.
   * @param func Returns a value or promise.
   * @return {Promise}
   */
  // TODO(burdon): Pass in ordered collection of promises.
  // TODO(burdon): Return array of values from each promise.
  static iterateWithPromises(collection, func) {
    let p = Promise.resolve();

    _.each(collection, (...args) => {
      p = p.then(() => {
        return Promise.resolve(func.apply(null, args));
      });
    });

    // Resolve after each item in the sequence resolves.
    return p;
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

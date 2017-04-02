//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Async utils.
 */
export class Async {

  /**
   * Wraps the timeout in a Promise.
   *
   * @param {number} t in ms.
   * @return {Promise}
   */
  static timeout(t) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, t);
    });
  }

  /**
   * Cancelable timeout function.
   *
   * @param {number} t in ms.
   * @returns {function(*)}
   */
  static delay(t=500) {
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
        }, now ? 0 : t);
      }
    }
  };

  /**
   * Aborts promise if times out.
   *
   * @param {Function} fn Function to execute returning a Promise.
   * @param {number} t Timeout in ms.
   * @return {Promise}
   */
  static abortAfter(fn, t=1000) {
    console.assert(fn);

    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(`Timed out (${t})`);
      }, t);

      fn()
        .then(value => {
          clearTimeout(timeout);
          resolve(value);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /**
   * Retry the promise with back-off.
   * @param {Function} fn Function to execute returning a Promise.
   * @param {number} retries
   * @param {number} delay
   * @param {number} maxDelay
   * @returns {Promise}
   */
  static retry(fn, retries=-1, delay=1000, maxDelay=60*1000) {
    console.assert(fn);

    let attempt = 0;
    const doRetry = () => {
      return new Promise((resolve, reject) => {
        fn(attempt)

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
                resolve(doRetry(fn));
              }, delay);
            }
          });
      });
    };

    return doRetry();
  }

  /**
   * Returns the given promise if defined, otherwise a resolved value.
   *
   * @param maybePromise
   * @param defaultValue
   * @return {Promise}
   */
  static promiseOf(maybePromise=undefined, defaultValue=undefined) {
    return maybePromise || Promise.resolve(defaultValue);
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

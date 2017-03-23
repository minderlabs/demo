//
// Copyright 2016 Minder Labs.
//

// TODO(burdon): Do this for other standard errors (per module?)
// NOTE: Function ensures stack is preserved.
export const NotAuthenticatedError = () => new Error('Not authenticated');

/**
 * General error utils.
 */
export class ErrorUtil {

  /**
   * Node-specific catch-all.
   *
   * @param root For node, provide process global; For DOM provide window.
   * @param {Function} callback (error) => {}.
   */
  static handleErrors(root, callback) {
    console.assert(root && callback);

    //
    // DOM
    // https://developer.mozilla.org/en-US/docs/Web/Events/error
    //

    if (typeof Window !== 'undefined') {

      // https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
      root.onerror = (messageOrEvent, source, lineno, colno, error) => {
        callback(error || messageOrEvent);

        // NOTE: Return true to stop propagation.
//        return true;
      }

      // https://developer.mozilla.org/en-US/docs/Web/Events/unhandledrejection
      root.addEventListener('unhandledrejection', error => callback(error));
    }

    //
    // Node
    // https://nodejs.org/api/errors.html
    // https://www.joyent.com/node-js/production/design/errors (Good general error handling article).
    //

    else {

      // https://nodejs.org/api/process.html#process_event_uncaughtexception
      root.on('uncaughtException', error => callback(error));

      // https://nodejs.org/api/process.html#process_event_unhandledrejection
      root.on('unhandledRejection', error => callback(error));
    }
  }

  /**
   * Flatten caught errors/exceptions.
   * Use this in catch handlers to throw Errors for caught exceptions or error messages.
   *
   * @param prefix
   * @param error
   * @return {Error}
   */
  static error(prefix, error) {
    return new Error(prefix + ': ' + ErrorUtil.message(error));
  }

  /**
   * Return error string from Error or string.
   * @param error
   */
  static message(error) {
    return error instanceof Error ? (error.originalMessage || error.message) : error;
  }
}

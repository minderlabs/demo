//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

//
// https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
//
const Errors = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  503: 'Service unavailable'
};

/**
 * Custom HTTP error that preserves stack traces and can be used to wrap exceptions.
 *
 * @param {number|string|Error} message Original error, error message, or error code.
 * @param {number} code HTTP code.
 * @constructor
 */
export function HttpError(message, code=500) {

  // Based on: http://stackoverflow.com/questions/1382107/whats-a-good-way-to-extend-error-in-javascript

  if (_.isNumber(message)) {
    code = message;
    message = Errors[code];
  }

  Object.defineProperty(this, 'name', {
    enumerable: false,
    writable: false,
    value: 'HttpError'
  });

  Object.defineProperty(this, 'message', {
    enumerable: false,
    writable: true,
    value: '[' + code + '] ' + (message || Errors[code] || '')
  });

  Object.defineProperty(this, 'code', {
    enumerable: false,
    writable: true,
    value: code
  });

  if (Error.hasOwnProperty('captureStackTrace')) { // V8
    Error.captureStackTrace(this, HttpError);
  } else {
    Object.defineProperty(this, 'stack', {
      enumerable: false,
      writable: false,
      value: (new Error(message)).stack
    });
  }
}

if (typeof Object.setPrototypeOf === 'function') {
  Object.setPrototypeOf(HttpError.prototype, Error.prototype);
} else {
  HttpError.prototype = Object.create(Error.prototype, {
    constructor: { value: HttpError }
  });
}


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

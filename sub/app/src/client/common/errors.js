//
// Copyright 2017 Minder Labs.
//

/**
 * Web client error handler.
 */
export class ErrorHandler {

  /**
   * Global error handling.
   */
  static handleErrors(eventHandler=null) {

    // TODO(burdon): Define in webpack?
    console.assert = (cond, message) => {
      if (!cond) {
        // NOTE: This is either caught by onerror or unhandledrejection below.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
        throw new Error(message ? 'Assert: ' + message : 'Assert failed.');
      }
    };

    // https://developer.mozilla.org/en-US/docs/Web/Events/error
    window.onerror = (error) => {
      console.error(error);
      eventHandler && eventHandler.emit({
        type: 'error',
        message: error.message
      });
    };

    // https://developer.mozilla.org/en-US/docs/Web/Events/unhandledrejection
    window.addEventListener('unhandledrejection', (event) => {
      let message = event.reason ? String(event.reason) : 'Uncaught promise';
      console.error(message);
      eventHandler && eventHandler.emit({
        type: 'error',
        message
      });
    });
  }
}

//
// Copyright 2016 Minder Labs.
//

export class ErrorUtil {

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
    return error instanceof Error ? error.message : error;
  }
}

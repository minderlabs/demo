//
// Copyright 2016 Minder Labs.
//

/**
 * HTTP utils.
 */
export class HttpUtil {

  // TODO(burdon): Tests.

  /**
   * Return map of args from URL.
   * @param url
   */
  static parseUrlArgs(url=document.location.href) {
    let search = url.substring(url.indexOf('?') + 1);
    return _.fromPairs(_.map(search.split('&'), keyValue => {
      let parts = keyValue.split('=');
      return [ decodeURIComponent(parts[0]), decodeURIComponent(parts[1]) ];
    }));
  }

  /**
   * Converts object to URL encoded search string.
   * @param {object} args
   * @returns {string}
   */
  static toUrlArgs(args) {
    return _.map(args, (v, k) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  }
}

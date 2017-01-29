//
// Copyright 2016 Minder Labs.
//

/**
 * HTTP utils.
 */
export class HttpUtil {

  /**
   * Changes a local url to an absolute.
   */
  static absoluteUrl(url, server=document.location.origin) {
    console.assert(url && server);
    return url.startsWith('/') ? server + url : url;
  }

  /**
   * Returns the server URL.
   * @return {string}
   */
  static getServerUrl() {
    return window.location.protocol + '//' + window.location.host;
  }

  /**
   * Safely joins the path components (stripping '/' chars as neee).
   * @param path
   * @param part
   * @return {string}
   */
  static joinUrl(path, part) {
    console.assert(path && part);
    return path.replace(/\/$/, '') + '/' + part.replace(/^\//, '');
  }

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
    return _.compact(_.map(args, (v, k) => (v !== undefined) && encodeURIComponent(k) + '=' + encodeURIComponent(v)))
      .join('&');
  }
}

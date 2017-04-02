//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

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
   * Returns a map of params from URL.
   * @param url
   * @param delim By default '?' but could be '#' for a URL fragment.
   */
  static parseUrlParams(url=document.location.href, delim='?') {
    url = url.replace(/#$/, '');  // Remove trailing hash.
    let search = url.substring(url.indexOf(delim) + 1);
    return _.fromPairs(_.map(search.split('&'), keyValue => {
      let parts = keyValue.split('=');
      return [ decodeURIComponent(parts[0]), decodeURIComponent(parts[1]) ];
    }));
  }

  /**
   * Creates a well-formed URL.
   * @param {string} url
   * @param {object} params
   * @returns {string}
   */
  static toUrl(url, params) {
    console.assert(url);
    return url.replace(/\/$/, '') + '?' + HttpUtil.toUrlArgs(params);
  }

  /**
   * Converts object to URL encoded search string.
   * @param {object} params
   * @returns {string}
   */
  static toUrlArgs(params) {
    return _.compact(_.map(params, (v, k) => (v !== undefined) && encodeURIComponent(k) + '=' + encodeURIComponent(v)))
      .join('&');
  }
}

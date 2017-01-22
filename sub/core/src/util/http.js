//
// Copyright 2016 Minder Labs.
//

/**
 * HTTP utils.
 */
export class HttpUtil {

  /**
   * Return map of args from URL.
   * @param url
   */
  static parseUrl(url=document.location.href) {
    let search = url.substring(url.indexOf('?') + 1);
    return _.fromPairs(_.compact(_.map(search.split('&'), item => item && item.split('='))));
  }
}

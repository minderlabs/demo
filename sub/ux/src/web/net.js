//
// Copyright 2017 Minder Labs.
//

import { HttpUtil } from 'minder-core';

/**
 * Web network utils.
 */
export class NetUtil {

  /**
   * Returns a well-formed absolute path.
   *
   * @param path
   * @param server
   * @returns {string}
   */
  static getUrl(path, server=undefined, ) {
    return HttpUtil.joinUrl(server || HttpUtil.getServerUrl(), path);
  }

  /**
   * POST JSON.
   *
   * NOTE: By default, doesn't pass cookies. To enable:
   *
   * xhrFields: {
   *   withCredentials: true
   * }
   *
   * @param url
   * @param data
   * @param headers
   * @param options
   * @return {Promise}
   */
  static postJson(url, data={}, headers={}, options={}) {
    console.assert(url && data && headers);
    return new Promise((resolve, reject) => {
      $.ajax(_.merge({
        type: 'POST',
        url,
        headers,

        dataType: 'json',
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',

        success: response => {
          resolve(response)
        },
        error: (xhr, textStatus, error) => {
          reject(error)
        }
      }, options));
    });
  }

  /**
   * GET JSON.
   *
   * @param url
   * @param args
   * @param headers
   * @param crossDomain
   * @return {Promise}
   */
  static getJson(url, args={}, headers={}, crossDomain=false) {
    return new Promise((resolve, reject) => {
      let options = {
        type: 'GET',
        url: HttpUtil.toUrl(url, args),
        headers,

        contentType: 'application/json; charset=utf-8',

        success: response => {
          resolve(response)
        },
        error: (xhr, textStatus, error) => {
          reject(error)
        }
      };

      //
      // JSONP appends a callback param; the server responds with a script that invokes this function.
      // NOTE: Under the covers a <script> tag is created that loads and evals the script.
      // https://www.html5rocks.com/en/tutorials/cors/
      // https://developer.chrome.com/extensions/xhr
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
      //
      if (crossDomain) {
        _.assign(options, {
          crossDomain: true,
          dataType: 'jsonp'
        });
      } else {
        _.assign(options, {
          dataType: 'json'
        });
      }

      $.ajax(options);
    });
  }
}

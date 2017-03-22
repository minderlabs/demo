//
// Copyright 2017 Minder Labs.
//

import { HttpUtil } from 'minder-core';

/**
 * Client network utils.
 */
export class NetUtil {

  // TODO(burdon): Factor out (without dependency on $).

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
   * AJAX Post.
   *
   * @param url
   * @param data
   * @param headers
   * @param async
   * @return {Promise}
   */
  static postJson(url, data, headers = {}, async = true) {
    console.assert(url && data && headers);
    return new Promise((resolve, reject) => {
      $.ajax({
        type: 'POST',
        url,
        async,
        headers,

        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify(data),

        success: response => {
          resolve(response)
        },
        error: (xhr, textStatus, error) => {
          reject(error)
        }
      });
    });
  }
}

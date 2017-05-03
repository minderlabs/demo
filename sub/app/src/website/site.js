//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { Words } from './words';

import './site.less';

window.Words = Words;

/**
 * Site utils.
 */
class Site {

  /**`
   * Post JSON message.
   * NOTE: Server checks loging cookie for auth.
   * @param url
   * @param data
   * @return {Promise}
   */
  static postJson(url, data) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify(data),
        success: response => {
          resolve(response);
        },
        error: (xhr, textStatus, error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Get JSON request.
   * @param url
   * @return {Promise}
   */
  static getJson(url) {
    return new Promise((resolve, reject) => {
      $.getJSON(url, data => resolve(data));
    });
  }
}

window._ = _;
window.moment = moment;
window.$ = $;

window.Site = Site;

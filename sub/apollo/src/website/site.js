//
// Copyright 2016 Minder Labs.
//

import { Auth } from './auth';
import { Words } from './words';

import './site.less';

window.Auth = Auth;
window.Words = Words;

/**
 * Site utils.
 */
class Site {

  static post(url, data) {
    $.ajax({
      url: url,
      type: 'POST',
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      data: JSON.stringify(data)
    });
  }
}

window.Site = Site;

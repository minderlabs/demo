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

  // TODO(burdon): Factor out.
  // TODO(burdon): Security: Require Auth header.
  static post(url, data) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify(data),
        success: response => { resolve(response) },
        error: (xhr, textStatus, error) => { reject(error) }
      });
    });
  }
}

window.Site = Site;

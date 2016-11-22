//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * Router paths.
 */
export class Path {

  static ROOT = '/';
  static HOME = '/inbox';

  static folder(alias) {
    return `/${alias}`;
  }

  static detail(view, itemId) {
    return `/${view}/${itemId}`;
  }
}

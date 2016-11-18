//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * React router path defs.
 */
export default class Path {

  static ROOT   = '/';
  static HOME   = '/inbox';
  static DETAIL = '/detail';
  static DEBUG  = '/debug';

  static detail(itemId) {
    return Path.DETAIL + '/' + itemId;
  }

}

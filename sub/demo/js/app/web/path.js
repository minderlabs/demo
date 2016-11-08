//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * React router path defs.
 */
export default class Path {

  static ROOT   = '/';
  static HOME   = '/inbox';
  static DETAIL = '/detail';
  static CREATE = '/create';
  static DEBUG  = '/debug';

  static detail(itemId) {
    return Path.DETAIL + '/' + itemId;
  }

}

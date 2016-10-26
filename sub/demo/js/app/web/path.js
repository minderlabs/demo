//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * React router path defs.
 */
export default class Path {

  static ROOT   = '/';
  static HOME   = '/home';
  static DETAIL = '/detail';
  static DEBUG  = '/debug';

  static detail(itemId) {
    return Path.DETAIL + '/' + itemId;
  }

}

//
// Copyright 2016 Alien Laboratories, Inc.
//

import _ from 'lodash';

/**
 * Common utils.
 */
export class Util {

  static JSON_REPLACER = (key, value) => { return _.isArray(value) ? value.length : value; };
}

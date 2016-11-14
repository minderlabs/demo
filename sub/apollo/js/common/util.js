//
// Copyright 2016 Alien Laboratories, Inc.
//

import _ from 'lodash';

/**
 * Common utils.
 */
export class Util {

  static JSON_REPLACER = (key, value) => { return _.isArray(value) ? value.length : value; };

  static clone(obj={}) {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Type utils.
 */
export class TypeUtil {

  static defaultMap(map, key, def=Map) {
    let value = map.get(key);
    if (value === undefined) {
      value = new def();
      map.set(key, value);
    }
    return value;
  }
}

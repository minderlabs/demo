//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Type utils.
 */
export class TypeUtil {

  static JSON_REPLACER = (key, value) => { return _.isArray(value) ? value.length : value; };

  static JSON = (json) => JSON.stringify(json, TypeUtil.JSON_REPLACER);

  static clone(obj={}) {
    return JSON.parse(JSON.stringify(obj));
  }

  static defaultMap(map, key, def=Map) {
    let value = map.get(key);
    if (value === undefined) {
      value = new def();
      map.set(key, value);
    }
    return value;
  }
}

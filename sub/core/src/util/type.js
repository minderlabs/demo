//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Type utils.
 */
export class TypeUtil {

  static JSON_REPLACER = (key, value) => { return _.isArray(value) ? value.length : value; };

  /**
   * Conside stringify.
   */
  static JSON = (json) => JSON.stringify(json, TypeUtil.JSON_REPLACER);

  /**
   * Clones simple JSON object.
   * @param obj
   */
  static clone(obj={}) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Multimap.
   * @param map
   * @param key
   * @param def
   * @returns {*}
   */
  static defaultMap(map, key, def=Map) {
    let value = map.get(key);
    if (value === undefined) {
      value = new def();
      map.set(key, value);
    }
    return value;
  }

  /**
   * Appends non-null values to array.
   * @param array
   * @param value Value or array of values.
   */
  static maybeAppend(array, value) {
    if (!_.isEmpty(value)) {
      if (_.isArray(value)) {
        _.each(value, v => array.push(v));
      } else {
        array.push(value);
      }
    }

    return array;
  }
}

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TODO(burdon): Inject Id generator (Stable IDs for debugging/refresh).
const DEBUG = true;
let count = 0;

export class Util {

  /**
   * Unique ID compatible with server.
   * @returns {string}
   */
  static createId() {
    if (DEBUG) {
      return 'GUID-' + (++count);
    }

    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  /**
   * Clone the JSON object.
   * @param obj
   */
  static copy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * String match the text against the given fields of the object.
   *
   * @param obj
   * @param fields
   * @param text
   * @returns {boolean}
   */
  static textMatch(obj, fields, text) {
    let match = false;

    if (text) {
      text = text.toLowerCase();
      _.forEach(_.pick(obj, fields), (value, field) => {
        match = value.toLowerCase().indexOf(text) != -1;
        if (match) {
          return false;
        }
      });
    }

    return match;
  }

  /**
   * Updates the field of the given object.
   *
   * @param obj
   * @param data
   * @param field
   * @param defaultValue
   */
  static maybeUpdateItem(obj, data, field, defaultValue=undefined) {
    let value = data[field];
    if (value === undefined) {
      value = defaultValue;
    }

    if (value !== undefined) {
      obj[field] = value;
    }
  }

  /**
   * StringListMutation
   *
   * @param obj
   * @param data
   * @param field
   */
  static updateStringSet(obj, data, field) {
    let values = obj[field] || [];
    for (let row of data[field] || []) {
      if (_.isString(row)) {
        // Set value.
        values.push(row);
      } else {
        // Delta.
        // NOTE: Implements Set semantics (i.e., unordered and removes existing).
        _.pull(values, row['value']);
        if (row['index'] != -1) {
          values.splice(0, 0, row['value']);
        }
      }
    }

    obj[field] = values;
  }
}

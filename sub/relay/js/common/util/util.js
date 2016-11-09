//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * Utils.
 */
export class Util {

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
   * Compute a search snippet given query text against the given fields of the object.
   *
   * @param obj
   * @param fields
   * @param text
   * @returns {boolean}
   */
  static computeSnippet(obj, fields, text) {
    let snippets = [];

    if (text) {
      text = text.toLowerCase();
      _.forEach(_.pick(obj, fields), (value, field) => {
        if (value.toLowerCase().indexOf(text) !== -1) {
          snippets.push(`${field}("${value}") matches "${text}"`);
        }
      });
    }

    return snippets;
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

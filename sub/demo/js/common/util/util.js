//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TODO(burdon): Webpack to create server.
var _ = require('lodash');

export class Util {

  //
  // Utils.
  //

  static createId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  static copy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static maybeUpdateItem(item, data, field, defaultValue=undefined) {
    let value = data[field];
    if (value === undefined && defaultValue !== undefined) {
      value = defaultValue;
    }

    if (value !== undefined) {
      item[field] = value;
    }
  }

  /**
   * StringListMutation
   *
   * @param item
   * @param data
   * @param field
   */
  static updateStringSet(item, data, field) {
    let values = item[field] || [];
    for (let row of data[field] || []) {
      if (_.isString(row)) {
        // Set value.
        values.push(row);
      } else {
        // Delta.
        if (row['index'] == -1) {
          _.pull(values, row['value']);
        } else {
          values.splice(row['index'], 0, row['value']);
        }
      }
    }
    item[field] = values;
  }
}

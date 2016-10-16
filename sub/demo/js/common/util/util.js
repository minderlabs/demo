//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

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
}

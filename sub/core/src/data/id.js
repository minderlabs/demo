//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

/**
 * ID Utils.
 */
export class ID {

  static fromGlobalId(globalId) {
    console.assert(_.isString(globalId));
    let parts = atob(globalId).match(/(.+)\/(.+)/);
    return {
      type: parts[1],
      id: parts[2]
    }
  }

  static toGlobalId(type, localId) {
    console.assert(_.isString(type) && _.isString(localId));
    return btoa(type + '/' + localId);
  }

  // TODO(burdon): GUID.
  static i = 0;
  static createId(type) {
    console.assert(type);
    return `i-${_.padStart(++ID.i, 3, '0')}`;
  }
}

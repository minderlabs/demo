//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

//
// Detect node.
// TODO(burdon): Factor out node/web abstraction layer.
//

if (typeof btoa === 'undefined') {
  // Emulate browser atob and btoa.
  global.btoa = function(str) {
    return new Buffer(str).toString('base64');
  };
  global.atob = function(str) {
    return new Buffer(str, 'base64').toString();
  };
}

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

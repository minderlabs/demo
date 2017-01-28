//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import Random from 'random-seed';

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
}

/**
 * Seedable ID generator.
 * NOTE: Use same seed for in-memory datastore testing. With persistent store MUST NOT be constant.
 */
export class IdGenerator {

  // TODO(burdon): Factor out random.
  // TODO(burdon): Ensure consistent with server.
  constructor(seed=undefined) {
    this._random = Random.create(seed);
  }

  /**
   * Unique ID compatible with server.
   * @returns {string}
   */
  createId() {
    const s4 = () => {
      return Math.floor(this._random.floatBetween(1, 2) * 0x10000)
        .toString(16)
        .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }
}

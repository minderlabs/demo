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

  /**
   * ID for Apollo Cache Normalization.
   * http://dev.apollodata.com/react/cache-updates.html#dataIdFromObject
   * @param result
   * @returns {*}
   */
  static dataIdFromObject(result) {
    if (result.__typename && result.id) {
      return result.__typename + '/' + result.id;
    }

    return null;
  }

  /**
   * Converts a global ID.
   * @param globalId
   * @returns {{type: *, id: *}}
   */
  static fromGlobalId(globalId) {
    console.assert(_.isString(globalId));
    let parts = atob(globalId).match(/(.+)\/(.+)/);
    return {
      type: parts[1],
      id: parts[2]
    }
  }

  /**
   * Converts a local ID and type.
   * @param {string} type
   * @param {string} localId
   * @returns {string}
   */
  static toGlobalId(type, localId) {
    console.assert(_.isString(type) && _.isString(localId));
    return btoa(type + '/' + localId);
  }

  /**
   * Returns the global ID of the item.
   * @param item
   * @return {string}
   */
  static getGlobalId(item) {
    return ID.toGlobalId(item.type, item.id);
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

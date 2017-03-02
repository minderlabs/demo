//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import Random from 'random-seed';

//
// If Node (i.e., not DOM) then augment global functions.
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
   * UTC timestamp (milliseonds)
   * https://en.wikipedia.org/wiki/Unix_time
   * https://docs.python.org/2/library/time.html#time.time (NOTE: Python counts in seconds).
   * http://stackoverflow.com/questions/18724037/datetime-unix-timestamp-contains-milliseconds
   * @return {number} GraphQL Timestamp.
   */
  static timestamp() {
    return _.now();
  }

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

  // TODO(burdon): ID: Namespace/Bucket/Type/ID.
  // TODO(burdon): (All parts are neede for getItems lookups).

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
    console.assert(item && item.type && item.id);
    return ID.toGlobalId(item.type, item.id);
  }

  /**
   * Creates a foreign key.
   * @param item
   * @return {string}
   */
  static getForeignKey(item) {
    console.assert(item && item.namespace && item.id, 'Cannot create FK: ' + JSON.stringify(item));
    return item.namespace + '/' + item.id;
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
  createId(prefix=undefined) {
    const s4 = () => {
      return Math.floor(this._random.floatBetween(1, 2) * 0x10000)
        .toString(16)
        .substring(1);
    };

    return (prefix || '') + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }
}

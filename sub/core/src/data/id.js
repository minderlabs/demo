//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import Random from 'random-seed';

//
// If Node (i.e., not DOM) then augment global functions.
// TODO(burdon): Factor out node/web abstraction layer.
//

// Emulate browser atob and btoa for Node.
if (typeof btoa === 'undefined') {

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

  // TODO(burdon): GUID: {Namespace/Bucket/Type/ID}
  // Items may be cloned into other Namespaces that reference the original Item (e.g., Google Docs).
  // Items may be moved across Buckets (e.g., transfer of ownership).
  // Types are invariant and should be part of the ID or Key.

  /**
   * ID for Apollo Cache Normalization (i.e., creating a GUID for the Store's index).
   * "id" is a custom field defined by our framework.
   * http://dev.apollodata.com/react/cache-updates.html#dataIdFromObject
   * @param obj Data item.
   * @returns {*}
   */
  static dataIdFromObject(obj) {
    if (obj.__typename && obj.id) {
      return obj.__typename + '/' + obj.id;
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
    console.assert(item && item.type && item.id, 'Invalid item: ' + JSON.stringify(item));
    return ID.toGlobalId(item.type, item.id);
  }

  /**
   * Creates a foreign key.
   * @param item
   * @return {string} or null if the foreign key cannot be created.
   */
  static getForeignKey(item) {
    if (item && item.namespace && item.id) {
      return item.namespace + '/' + item.id;
    } else {
      return null;
    }
  }
}

/**
 * Seedable ID generator.
 * NOTE: Use same seed for in-memory datastore testing. With persistent store MUST NOT be constant.
 */
export class IdGenerator {

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

  // TODO(burdon): node-uuid (client/server?)
  // https://www.npmjs.com/package/uuid

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

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

import Matcher from './matcher';

/**
 * In-memory database.
 */
export default class Database {

  // TODO(burdon): Factor out util.
  static clone(item={}) {
    return JSON.parse(JSON.stringify(item));
  }

  static fromGlobalId(globalId) {
    console.assert(globalId);
    let parts = atob(globalId).match(/(.+)\/(.+)/);
    return {
      type: parts[1],
      id: parts[2]
    }
  }

  static toGlobalId(type, localId) {
    console.assert(type && localId);
    return btoa(type + '/' + localId);
  }

  static i = 0;
  static createId(type) {
    console.assert(type);
    // TODO(burdon): Random with seed.
    return `i-${_.padStart(++Database.i, 3, '0')}`;
  }

  // TODO(burdon): Logger.

  constructor() {
    // Items indexed by ID.
    this._items = new Map();

    // Query matcher.
    this._matcher = new Matcher();
  }

  /**
   *
   * @param items
   */
  upsertItems(items) {
    _.each(items, (item) => {
      item = Database.clone(item);
      if (!item.id) {
        item.id = Database.createId(item.type);
      }

      console.log('DB.UPSERT[%s]', item.id, JSON.stringify(item));
      this._items.set(item.id, item);
    });
  }

  /**
   *
   * @param type
   * @param itemId
   * @returns {*}
   */
  getItem(type, itemId) {
    console.log('DB.GET[%s]', itemId);

    return Database.clone(this._items.get(itemId));
  }

  /**
   *
   * @param filter
   * @param offset
   * @param count
   * @returns {Array}
   */
  queryItems(filter, offset=0, count=10) {
    let items = [];
    this._items.forEach((item) => {
      if (!this._matcher.match(filter, item)) {
        return;
      }

      items.push(Database.clone(item));
    });

    items = _.sortBy(items, ['title']);
    items = _.slice(items, offset, offset + count);

    console.log('DB.QUERY[%d:%d][%s]: %d', offset, count, JSON.stringify(filter), items.length);
    return items;
  }
}

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

  static i = 0;

  // TODO(burdon): ID should encode type.
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

  getItem(itemId) {
    console.log('DB.GET[%s]', itemId);

    return Database.clone(this._items.get(itemId));
  }

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

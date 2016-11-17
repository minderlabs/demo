//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

import { ID, Matcher, TypeUtil } from 'minder-core';

/**
 * In-memory database.
 */
export class Database {

  // TODO(burdon): Logger.

  constructor() {
    // Map items.
    this._items = new Map();

    // Query matcher.
    this._matcher = new Matcher();
  }

  /**
   *
   * @param items
   */
  upsertItems(items) {
    return _.map(items, (item) => {
      item = TypeUtil.clone(item);
      if (!item.id) {
        item.id = ID.createId(item.type);
      }

      console.log('DB.UPSERT[%s]', item.id, JSON.stringify(item));
      this._items.set(item.id, item);

      return item;
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
    console.assert(type && itemId);

    return TypeUtil.clone(this._items.get(itemId));
  }

  /**
   *
   * @param filter
   * @param offset
   * @param count
   * @returns {Array}
   */
  queryItems(filter={}, offset=0, count=10) {
    let items = [];
    this._items.forEach((item) => {
      if (!this._matcher.match(filter, item)) {
        return;
      }

      items.push(TypeUtil.clone(item));
    });

    items = _.sortBy(items, ['title']);
    items = _.slice(items, offset, offset + count);

    console.log('DB.QUERY[%d:%d][%s]: %s', offset, count, JSON.stringify(filter), TypeUtil.JSON({ items: items }));
    return items;
  }
}

//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { TypeUtil } from 'minder-core';

import { Database } from './database';

/**
 * In-memory database.
 */
export class MemoryDatabase extends Database {

  // TODO(burdon): Factor out logging.

  constructor() {
    super();

    // Map items.
    this._items = new Map();
  }

  upsertItems(context, items) {
    return _.map(items, (item) => {
      item = TypeUtil.clone(item);

      console.assert(item.type);
      if (!item.id) {
        item.id = Database.IdGenerator.createId();
      }

      // TODO(burdon): Enforce immutable type.
      console.log('DB.UPSERT[%s]', item.id, JSON.stringify(item));
      this._items.set(item.id, item);

      return item;
    });
  }

  getItems(context, type, itemIds) {
    console.log('DB.GET[%s]', itemIds);
    console.assert(type && itemIds);

    return _.map(itemIds, itemId => TypeUtil.clone(this._items.get(itemId) || {}));
  }

  queryItems(context, filter={}, offset=0, count=10) {
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

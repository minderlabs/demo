//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { ItemStore, TypeUtil } from 'minder-core';

import { Database } from './database';

/**
 * In-memory database.
 */
export class MemoryItemStore extends ItemStore {

  constructor(matcher) {
    super(matcher);

    // Map items.
    this._items = new Map();
  }

  upsertItems(context, items) {
    console.assert(context && items);

    return Promise.resolve(_.map(items, (item) => {
      item = TypeUtil.clone(item);

      console.assert(item.type);
      if (!item.id) {
        item.id = Database.IdGenerator.createId();
      }

      // TODO(burdon): Enforce immutable properties (e.g., type).
      this._items.set(item.id, item);

      return item;
    }));
  }

  getItems(context, type, itemIds) {
    console.assert(context && type && itemIds);

    return Promise.resolve(_.map(itemIds, itemId => TypeUtil.clone(this._items.get(itemId) || {})));
  }

  queryItems(context, root, filter={}, offset=0, count=10) {
    console.assert(context && filter);

    let items = [];
    this._items.forEach((item) => {
      if (!this._matcher.matchItem(context, root, filter, item)) {
        return;
      }

      items.push(TypeUtil.clone(item));
    });

    // Sort.
    let sort = filter.sort;
    if (sort) {
      console.assert(sort.field);
      items = _.sortBy(items, [sort.field]);
    }

    // Page.
    items = _.slice(items, offset, offset + count);

    return Promise.resolve(items);
  }
}

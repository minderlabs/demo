//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { TypeUtil } from '../util/type';

import { ItemStore, QueryProcessor } from './item_store';
import { Matcher } from './matcher';

/**
 * Cache.
 */
export class ItemStoreCache {

  constructor(idGenerator, matcher) {
    console.assert(idGenerator && matcher);
    this._idGenerator = idGenerator;
    this._matcher = matcher;

    // Items by ID.
    // TODO(burdon): Index by bucket also.
    this._items = new Map();
  }

  queryItems(context, root, filter, offset, count) {
    console.assert(context && filter);
    let items = [];

    // Match items.
    this._items.forEach(item => {
      if (this._matcher.matchItem(context, root, filter, item)) {
        items.push(item);
      }
    });

    // Sort.
    items = Matcher.sortItems(items, filter);

    // Page.
    items = _.slice(items, offset, offset + count);

    // Clone items.
    return _.map(items, item => TypeUtil.clone(item));
  }

  getItems(itemIds) {
    console.assert(itemIds);
    let items = _.compact(_.map(itemIds, itemId => this._items.get(itemId)));
    return _.map(items, item => TypeUtil.clone(item));
  }

  upsertItems(items) {
    console.assert(items);
    return _.map(items, item => {
      let clonedItem = ItemStore.onUpdate(this._idGenerator, TypeUtil.clone(item));
      this._items.set(clonedItem.id, clonedItem);
      return clonedItem;
    });
  }
}

/**
 * In-memory database.
 */
export class MemoryItemStore extends ItemStore {

  // TODO(burdon): Store by bucket? Use context?

  constructor(idGenerator, matcher, namespace) {
    super(namespace);

    this._cache = new ItemStoreCache(idGenerator, matcher);
  }

  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    return Promise.resolve(this._cache.queryItems(context, root, filter, offset, count));
  }

  getItems(context, type, itemIds) {
    return Promise.resolve(this._cache.getItems(itemIds));
  }

  upsertItems(context, items) {
    return Promise.resolve(this._cache.upsertItems(items));
  }
}

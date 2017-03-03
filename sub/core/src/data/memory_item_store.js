//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { TypeUtil } from '../util/type';

import { ItemUtil, ItemStore, QueryProcessor } from './item_store';

/**
 * In-memory database.
 */
export class MemoryItemStore extends ItemStore {

  constructor(idGenerator, matcher, namespace, buckets=true) {
    super(namespace, buckets);

    // Helper for filtering and sorting items.
    this._util = new ItemUtil(idGenerator, matcher);

    // Item stored by key.
    this._items = new Map();
  }

  toString() {
    return `MemoryItemStore(${this._items.size})`;
  }

  key({ bucket, type, id }) {
    console.assert(bucket || !this._buckets, 'Invalid bucket for item: ' + id);

    return _.compact([bucket, type, id]).join('/');
  }

  getBucketKeys(context, type=undefined) {
    if (this._buckets) {
      return _.map(QueryProcessor.getBuckets(context), bucket => this.key({ bucket, type }));
    } else {
      return [this.key({ type })];
    }
  }

  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    console.assert(context && root && filter);

    let items = this._util.filterItems(this._items, context, root, filter, offset, count);
    return Promise.resolve(_.map(items, item => TypeUtil.clone(item)));
  }

  getItems(context, type, itemIds=[]) {
    console.assert(context && type && itemIds);

    // Check all buckets.
    let items = [];
    _.each(this.getBucketKeys(context, type), key => {
      TypeUtil.maybeAppend(items, _.compact(_.map(itemIds, itemId => this._items.get(key + '/' + itemId))));
    });

    return Promise.resolve(_.map(items, item => TypeUtil.clone(item)));
  }

  upsertItems(context, items) {
    console.assert(context && items);

    return Promise.resolve(_.map(items, item => {
      console.assert(!this._buckets || item.bucket, 'Invalid bucket: ' + JSON.stringify(item));
      let clonedItem = this._util.onUpdate(TypeUtil.clone(item));
      let key = this.key(clonedItem);
      this._items.set(key, clonedItem);
      return clonedItem;
    }));
  }
}

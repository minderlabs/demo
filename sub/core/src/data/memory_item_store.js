//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { TypeUtil } from '../util/type';

import { BaseItemStore, QueryProcessor } from './item_store';

/**
 * In-memory database.
 */
export class MemoryItemStore extends BaseItemStore {

  constructor(idGenerator, matcher, namespace, buckets=true) {
    super(idGenerator, matcher, namespace, buckets);

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

  getBucketKeys(context, type) {
    if (this._buckets) {
      return _.map(QueryProcessor.getBuckets(context), bucket => this.key({ bucket, type }));
    } else {
      console.assert(type);
      return [this.key({ type })];
    }
  }

  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    console.assert(context && root && filter);

    // Gather results for all buckets.
    let bucketItems = [];
    if (this._buckets) {
      let bucketKeys = this.getBucketKeys(context);
      this._items.forEach((item, key) => {
        _.each(bucketKeys, bucketKey => {
          if (key.startsWith(bucketKey)) {
            bucketItems.push(item);
            return false;
          }
        });
      });
    } else {
      bucketItems = this._items;
    }

    let items = this.filterItems(bucketItems, context, root, filter, offset, count);
    return Promise.resolve(_.map(items, item => TypeUtil.clone(item)));
  }

  getItems(context, type, itemIds=[]) {
    console.assert(context && type && itemIds);

    // Check all buckets.
    let items = [];
    _.each(this.getBucketKeys(context, type), bucketId => {
      TypeUtil.maybeAppend(items, _.compact(_.map(itemIds, itemId => this._items.get(bucketId + '/' + itemId))));
    });

    return Promise.resolve(_.map(items, item => TypeUtil.clone(item)));
  }

  upsertItems(context, items) {
    console.assert(context && items);

    return Promise.resolve(_.map(items, item => {
      console.assert(!this._buckets || item.bucket, 'Invalid bucket: ' + JSON.stringify(item));

      let clonedItem = this.onUpdate(TypeUtil.clone(item));
      let key = this.key(clonedItem);
      this._items.set(key, clonedItem);
      return clonedItem;
    }));
  }
}

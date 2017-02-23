//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { ItemStore, ItemStoreCache } from 'minder-core';

/**
 * Item store.
 *
 * NAMESPACE:BUCKET:TYPE:ID => { Item }
 *
 * Examples:
 * accounts/  system/     User/     user-1
 * data/      bucket-1/   Task/     task-1
 * google/    bucket-2/   Contact/  contact-1
 */
export class FirebaseItemStore extends ItemStore {

  // TODO(burdon): Items without a bucket are system items?
  // TODO(burdon): Enforce in UI (i.e., add bucket from either group or user).

  constructor(db, idGenerator, matcher, namespace) {
    super(namespace);
    console.assert(db);
    this._db = db;
    this._cache = new ItemStoreCache(idGenerator, matcher);
  }

  /**
   * @returns {string} NAMESPACE:BUCKET:TYPE:ID
   *
   * https://firebase.google.com/docs/database/web/structure-data
   * Keys must be UTF-8 encoded, can be a maximum of 768 bytes,
   * and cannot contain ., $, #, [, ], /, or ASCII control characters 0-31 or 127.
   */
  key(item) {
    console.assert(item.bucketId);
    return `/${this.namespace}/${item.bucketId}/${item.type}/${item.id}`;
  }

  updateCache() {

    // TODO(burdon): Is namespace part of the key?
    // TODO(burdon): Implement cache and listen for updates.
    // https://firebase.google.com/docs/database/web/read-and-write#read_data_once
    // https://firebase.google.com/docs/reference/js/firebase.database.Reference#once
    // https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
    return this._db.ref(this._path).orderByKey().once('value');
  }

  upsertItems(context, items) {
    // TODO(burdon): Update multiple items?
    _.each(items, item => {

      // TODO(burdon): Does this call an update?
      // https://firebase.google.com/docs/database/web/read-and-write
      this._db.ref(this.key(item)).set(item);
    });
  }

  getItems(context, type, itemIds) {
    return this._cache.getItems(itemIds);
  }

  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    return this._cache.queryItems(context, root, filter, offset, count);
  }
}

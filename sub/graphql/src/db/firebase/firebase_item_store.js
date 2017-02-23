//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { ItemStore, ItemUtil, QueryProcessor } from 'minder-core';

/**
 * Item store.
 *
 * https://firebase.google.com/docs/reference/js/firebase.database.Reference
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

  constructor(idGenerator, matcher, db, namespace) {
    super(namespace);

    /**
     * https://firebase.google.com/docs/database/web/structure-data
     * Keys must be UTF-8 encoded, can be a maximum of 768 bytes,
     * and cannot contain ., $, #, [, ], /, or ASCII control characters 0-31 or 127.
     */
    this._util = new ItemUtil(idGenerator, matcher);

    console.assert(db);
    this._db = db;
  }

  key(args=[]) {
    return '/' + this.namespace + '/' + args.join('/');
  }

  getValue(key) {
    return new Promise((resolve, reject) => {
      this._db.ref(key).once('value', data => {
        resolve(data.val());
      });
    });
  }

  /**
   * Resets the store.
   */
  clear() {
    return new Promise((resolve, reject) => {
      let ref = this._db.ref(this.key());
      ref.set(null, error => {
        if (error) { reject(); } else { resolve(this); }
      });
    });
  }

  /**
   * https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
   */
  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    let { groupId, userId } = context;

    // Gather results for each bucket.
    let promises = [];

    if (groupId) {
      promises.push(this.getValue(this.key([ groupId ])));
    }

    if (userId) {
      promises.push(this.getValue(this.key([ userId ])));
    }

    return Promise.all(promises).then(buckets => {
      let items = [];
      _.each(buckets, typeMap => {
        _.each(typeMap, (itemMap, type) => {
          _.each(itemMap, (item, key) => {
            items.push(item);
          });
        });
      });

      return this._util.filterItems(items, context, root, filter, offset, count);
    });
  }

  /**
   *
   */
  getItems(context, type, itemIds) {
    let { groupId, userId } = context;

    // Gather results for each bucket.
    let promises = [];

    if (groupId) {
      promises.push(this.getValue(this.key([ groupId, type ])));
    }

    if (userId) {
      promises.push(this.getValue(this.key([ userId, type ])));
    }

    return Promise.all(promises).then(buckets => {
      let items = [];
      _.each(buckets, itemMap => {
        _.each(itemIds, itemId => {
          let item = _.get(itemMap, itemId);
          if (item) {
            items.push(item);
          }
        });
      });

      return items;
    });
  }

  /**
   * https://firebase.google.com/docs/database/web/read-and-write
   */
  upsertItems(context, items) {
    let promises = [];

    _.each(items, item => {
      this._util.onUpdate(item);
      let { bucket, type, id:itemId } = item;
      let key = this.key([bucket, type, itemId]);
      let ref = this._db.ref(key);
      promises.push(new Promise((resolve, reject) => {
        ref.set(item, error => {
          if (error) { reject(); } else { resolve(item); }
        });
      }));
    });

    return Promise.all(promises);
  }
}

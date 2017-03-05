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
 * /NAMESPACE   /[BUCKET]   /TYPE     /ID     => { Item }
 *
 * /system                  /User     /user-1             System data.
 * /system                  /Group    /group-1
 * /user        /bucket-1   /Task     /task-1             First party data.
 * /google_com  /bucket-2   /Contact  /contact-1          Third-party data.
 */
export class FirebaseItemStore extends ItemStore {

  constructor(idGenerator, matcher, db, namespace, buckets=false) {
    super(namespace, buckets);

    this._util = new ItemUtil(idGenerator, matcher);

    console.assert(db);
    this._db = db;
  }

  /**
   * https://firebase.google.com/docs/database/web/structure-data
   * Keys must be UTF-8 encoded, can be a maximum of 768 bytes,
   * and cannot contain ., $, #, [, ], /, or ASCII control characters 0-31 or 127.
   */
  key(args=[]) {
    _.each(args, arg => console.assert(!_.isNil(arg), 'Invalid key: ' + JSON.stringify(args)));
    return '/' + this.namespace + '/' + args.join('/');
  }

  /**
   * Return root keys for all buckets accessible to this user.
   * Override if no buckets (i.e., system store).
   * @param context
   * @param type
   * @returns {Array}
   */
  getBucketKeys(context, type=undefined) {
    if (this._buckets) {
      return _.map(QueryProcessor.getBuckets(context), bucket => this.key(_.compact([bucket, type])));
    } else {
      return [this.key(_.compact([type]))];
    }
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
   *
   * @param key
   * @returns {Promise}
   */
  _getValue(key) {
    return new Promise((resolve, reject) => {
      // https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
      this._db.ref(key).once('value', data => {
        resolve(data.val());
      });
    });
  }

  /**
   *
   */
  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {

    // Gather results for all buckets.
    let promises = _.map(this.getBucketKeys(context), key => this._getValue(key));
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

    // Gather results for each bucket.
    // TODO(burdon): Maintain ID=>bucket index for ACL.
    let promises = _.map(this.getBucketKeys(context, type), key => this._getValue(key));
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
   *
   */
  upsertItems(context, items) {
    let promises = [];

    _.each(items, item => {
      this._util.onUpdate(item);

      // NOTE: Bucket is optional for some stores (e.g., system).
      let { bucket, type, id:itemId } = item;
      console.assert(type && itemId);

      promises.push(new Promise((resolve, reject) => {
        let key = this.key(_.compact([ bucket, type, itemId ]));
        let ref = this._db.ref(key);

        // https://firebase.google.com/docs/database/web/read-and-write
        ref.set(item, error => {
          if (error) { reject(); } else { resolve(item); }
        });
      }));
    });

    return Promise.all(promises);
  }
}

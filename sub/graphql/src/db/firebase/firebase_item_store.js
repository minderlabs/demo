//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { ItemStore } from 'minder-core';

import { Database } from '../database';
import { Cache } from './cache';

/**
 * Item store.
 *
 * Database hierarchy:
 *
 *  items/
 *    TYPE/
 *      ID:Item
 */
export class FirebaseItemStore extends ItemStore {

  // Root database node.
  static ROOT = 'items';

  /**
   * Parses the root node of the data set, inserting items into the item store.
   * Flattens all items into a single map.
   *
   * @param itemStore
   * @param data
   */
  static parseData(itemStore, data) {
    let items = [];
    _.each(data.val(), (records, type) => {
      _.each(records, (item, id) => {
        items.push(item);
      });
    });

    itemStore.upsertItems({}, items);
  }

  constructor(db, idGenerator, matcher) {
    super(idGenerator, matcher);
    console.assert(db);

    this._db = db;

    // TODO(burdon): Need to be able to reset cache.
    this._cache = new Cache(this._db, FirebaseItemStore.ROOT, idGenerator, matcher, FirebaseItemStore.parseData);
  }

  clearCache() {
    return this._cache.getItemStore(true);
  }

  //
  // ItemStore API.
  //

  upsertItems(context, items) {
    // https://firebase.google.com/docs/database/web/read-and-write
    _.each(items, item => {
      console.assert(item.type);
      if (!item.id) {
        item.id = this._idGenerator.createId();
        item.created = moment().unix();
      }

      item.modified = moment().unix();

      this._db.ref(FirebaseItemStore.ROOT + '/' + item.type + '/' + item.id).set(item);
    });

    return this._cache.getItemStore()
      .then(itemStore => itemStore.upsertItems(context, items));
  }

  getItems(context, type, itemIds) {
    return this._cache.getItemStore()
      .then(itemStore => itemStore.getItems(context, type, itemIds));
  }

  queryItems(context, root, filter={}, offset=0, count=10) {
    return this._cache.getItemStore()
      .then(itemStore => itemStore.queryItems(context, root, filter))
      .then(items => {
        // Sort.
        let orderBy = filter.orderBy;
        if (orderBy) {
          console.assert(orderBy.field);
          items = _.orderBy(items, [orderBy.field], [orderBy.order === 'DESC' ? 'desc' : 'asc']);
        }

        console.log(items.length + '::' + count);

        // Page.
        items = _.slice(items, offset, offset + count);

        return items;
      });
  }
}

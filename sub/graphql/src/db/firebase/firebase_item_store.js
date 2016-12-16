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

  constructor(db, matcher) {
    super(matcher);
    console.assert(db);

    this._db = db;
    this._cache = new Cache(this._db, FirebaseItemStore.ROOT, matcher, FirebaseItemStore.parseData);
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
        item.id = Database.IdGenerator.createId();
        item.created = moment().unix();
      }

      item.modified = moment().unix();

      this._db.ref(FirebaseItemStore.ROOT + '/' + item.type + '/' + item.id).set(item);
    });

    return this._cache.getItemStore().then(itemStore => itemStore.upsertItems(context, items));
  }

  getItems(context, type, itemIds) {
    return this._cache.getItemStore().then(itemStore => itemStore.getItems(context, type, itemIds));
  }

  queryItems(context, root, filter={}) {
    let items = this._cache.getItemStore().then(itemStore => itemStore.queryItems(context, root, filter));

    // Sort.
    let sort = filter.sort;
    if (sort) {
      console.assert(sort.field);
      items = _.orderBy(items, [sort.field], [sort.order === 'DESC' ? 'desc' : 'asc']);
    }

    return items;
  }
}

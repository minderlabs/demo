//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { IdGenerator, ItemStore, TypeUtil } from 'minder-core';

/**
 * Base database implementation.
 */
export class Database extends ItemStore {

  // TODO(burdon): Logger.

  static DEFAULT = '*';

  static IdGenerator = new IdGenerator(1000);

  constructor(matcher) {
    super(matcher);

    // ItemStores.
    // TODO(burdon): Should be by domain?
    this._stores = new Map();

    // Callback.
    this._onMutation = null;
  }

  /**
   * Register fan-out stores.
   *
   * @param type
   * @param store
   * @returns {Database}
   */
  registerItemStore(type, store) {
    console.assert(type && store);
    this._stores.set(type, store);
    return this;
  }

  getItemStore(type) {
    return this._stores.get(type) || this._stores.get(Database.DEFAULT);
  }

  // TODO(burdon): Evolve into mutation dispatcher to QueryRegistry.
  onMutation(callback) {
    this._onMutation = callback;
    return this;
  }

  handleMutation(context, items) {
    this._onMutation && this._onMutation(context, items);
  }

  //
  // Helper methods.
  //

  getItem(context, type, itemId) {
    return this.getItems(context, type, [itemId]).then(items => items[0]);
  }

  upsertItem(context, item) {
    return this.upsertItems(context, [item]).then(items => items[0]);
  }

  //
  // ItemStore API
  //

  /**
   * Converts the value to a promise (if it isn't already).
   * Helps to propagate async chain for eventual synchronous await.
   * @param value
   * @returns {*}
   */
  // TODO(burdon): Factor out (and explain).
  static promisify(value) {
    if (value.then) {
      return value;
    } else {
      return new Promise((resolve, reject) => {
        resolve(value);
      });
    }
  }

  /**
   * @returns {Promise}
   */
  upsertItems(context, items) {
    console.log('DB.UPSERT: %s', TypeUtil.JSON(items));

    // TODO(burdon): Dispatch to store (check permissions).
    let itemStore = this.getItemStore(Database.DEFAULT);
    return Database.promisify(itemStore.upsertItems(context, items)).then(modifiedItems => {

      // Invalidate clients.
      this.handleMutation(context, modifiedItems);

      return modifiedItems;
    });
  }

  /**
   * @returns {Promise}
   */
  getItems(context, type, itemIds) {
    console.log('DB.GET[%s]: [%s]', type, itemIds);

    let itemStore = this.getItemStore(type);
    return Database.promisify(itemStore.getItems(context, type, itemIds)).then(items => {
      if (!_.compact(items).length) {
        console.warn('Invalid result: %s' % items);
      }

      return items;
    });
  }

  /**
   * @returns {Promise}
   */
  queryItems(context, filter={}, offset=0, count=10) {
    console.log('DB.QUERY[%d:%d]: %s', offset, count, JSON.stringify(filter));

    let itemStore = this.getItemStore(filter.type);
    return Database.promisify(itemStore.queryItems(context, filter, offset, count));
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { $$, Logger, IdGenerator, ItemStore, TypeUtil } from 'minder-core';

const logger = Logger.get('db');


/**
 * Base database implementation.
 */
export class Database extends ItemStore {

  // TODO(burdon): Logger.

  static DEFAULT = '*';

  // TODO(burdon): Inject.
  static IdGenerator = new IdGenerator(1000);

  constructor(matcher) {
    super(matcher);

    // ItemStores.
    // TODO(burdon): Should be by domain?
    this._stores = new Map();

    // SearchProviders. Keyed by source name.
    this._providers = new Map();

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

  registerSearchProvider(source, provider) {
    console.assert(source && provider);
    this._providers.set(source, provider);
    return this;
  }

  getSearchProviders(filter) {
    // TODO(madadam): Allow filter to specify which sources to dispatch to. For now, fan out to all.
    return Array.from(this._providers.values());
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
  // ItemStore API.
  //

  /**
   * @returns {Promise}
   */
  upsertItems(context, items) {
    logger.log($$('UPSERT: %s', items.length > 1 ? TypeUtil.stringify(items) : JSON.stringify(items)));

    // TODO(burdon): Dispatch to store (check permissions).
    let itemStore = this.getItemStore(Database.DEFAULT);
    return itemStore.upsertItems(context, items).then(modifiedItems => {

      // Invalidate clients.
      this.handleMutation(context, modifiedItems);

      return modifiedItems;
    });
  }

  /**
   * @returns {Promise}
   */
  getItems(context, type, itemIds) {
    logger.log($$('GET[%s]: [%s]', type, itemIds));

    let itemStore = this.getItemStore(type);
    return itemStore.getItems(context, type, itemIds).then(items => {
      if (!_.compact(items).length) {
        console.warn('Invalid result: %s' % items);
      }

      return items;
    });
  }

  /**
   * @returns {Promise}
   */
  queryItems(context, root, filter={}, offset=0, count=10) {
    logger.log($$('QUERY[%s:%s]: %O', offset, count, filter));

    let itemStore = this.getItemStore(filter.type);
    return itemStore.queryItems(context, root, filter, offset, count);
  }

  /**
   * @returns {Promise}
   */
  search(context, root, filter={}, offset=0, count=10) {
    logger.log($$('QUERY[%s:%s]: %O', offset, count, filter));

    // TODO(madadam): Wrap results in SearchResult schema object?

    let searchProviders = this.getSearchProviders(filter);

    let searchPromises = [];
    for (let provider of searchProviders) {
      // TODO(madadam): Pagination over the merged result set. Need to over-fetch from each provider.
      searchPromises.push(provider.queryItems(context, root, filter, offset, count));
    }
    return Promise.all(searchPromises)
      .then((results) => {
        // TODO(madadam): better merging, scoring, etc.
        let merged = [].concat.apply([], results);
        return merged;
      });
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { $$, ID, Logger, ItemStore, ItemUtil, QueryProcessor, TypeUtil } from 'minder-core';

const logger = Logger.get('db');

/**
 * Canonical Source of Truth for the data model design.
 * - https://docs.google.com/document/d/1qMwaBb8jcip1zZipvFIM5SZDDE07ZL5Lpz0UtM1dH-I
 *
 * - Data Items are stored in different Namespaces.
 *   - The "system" Namespace stores Group, User items, etc.
 *   - The "user" Namespace stores all first-party user data.
 *   - Other Namespaces (e.g., "google") store third-party data (which is synced externall and may be joined).
 *
 * - The canonical Global Item ID is "[namespace]/type/itemId".
 *   - See ID.toGlobalId and ID.fromGlobalId
 *   - The default namespace is "user" and is omitted.
 *   - Global IDs are used for permalinks.
 *   - The local ItemId is globally unique within the namespace (i.e., the type is a hint for GQL Item resolution).
 *
 * - Queries and Mutations can specify non-standard Namespaces.
 *   - Special ACLs are applied to "system" Queries and Mutations.
 *
 * - User Items declare a Bucket which corresponds to a Group or User ID.
 *   - The database key is: "NAMESPACE/BUCKET/TYPE/ITEM-ID"
 *
 * - Queries implicitely declare Buckets via the resolver context (which computes which buckets are accessible).
 */
export class Database {

  // Multi-group support.
  // TODO(burdon): Mutator take namespace.
  // TODO(burdon): UpsertItemsMutation multiple items. Map create/update IDs. Set Namespace.
  // TODO(burdon): ID with optional namespace? (Otherwise client must specify in fn args -- can it alwasy know?)
  // TODO(burdon): Path (optional namespace: e.g., for "system" namespace).
  // TODO(burdon): System store return namespace.
  // TODO(burdon): Remove Database.getNamespaceForType: get namespace from ID (default to user). Add namespace to mutation sig.

  // TODO(burdon): TestData/Randomizer set bucket. Set parent project.
  // TODO(burdon): UX add bucket from context. Add project to sub-tasks.
  // TODO(burdon): Reject lookup if context doesn't allow bucket.
  // TODO(burdon): Debug: list all items in cache; reset cache.

  // TODO(burdon): Support multiple groups (context, itemstore).
  // TODO(burdon): Mutator reducer listen for all.

  static NAMESPACE = {
    SYSTEM:   'system',
    SETTINGS: 'settings',
    USER:     'user'
  };

  static isExternalNamespace(namespace) {
    console.assert(_.isString(namespace));

    switch (namespace) {
      case Database.NAMESPACE.SYSTEM:
      case Database.NAMESPACE.SETTINGS:
      case Database.NAMESPACE.USER:
        return false;
    }

    return true;
  }

  constructor() {

    // QueryProcessors by namespace.
    this._queryProcessors = new Map();

    // ItemStores by namespace.
    this._stores = new Map();

    // Callback.
    this._onMutation = null;
  }

  /**
   * Register query processor for namespace.
   *
   * @param {QueryProcessor} processor
   * @return {Database}
   */
  registerQueryProcessor(processor) {
    logger.log('Registered QueryProcessor: ' + processor.namespace);
    console.assert(processor && processor.namespace);
    console.assert(!this._queryProcessors.get(processor.namespace), 'Already registered: ' + processor.namespace);
    this._queryProcessors.set(processor.namespace, processor);
    return this;
  }

  /**
   * Register item store for namespace.
   *
   * @param store
   * @returns {Database}
   */
  registerItemStore(store) {
    logger.log('Registered ItemStore: ' + store.namespace);
    console.assert(store && store.namespace);
    console.assert(!this._stores.get(store.namespace), 'Already registered: ' + store.namespace);
    this._stores.set(store.namespace, store);
    return this;
  }

  /**
   * @param namespace
   * @return {ItemStore}
   */
  getQueryProcessor(namespace=Database.NAMESPACE.USER) {
    let queryProcessor = this._queryProcessors.get(namespace);
    console.assert(queryProcessor, 'Invalid QueryProcessor namespace: ' + namespace);
    return queryProcessor;
  }

  /**
   * @param namespace
   * @return {ItemStore}
   */
  getItemStore(namespace=Database.NAMESPACE.USER) {
    let itemStore = this._stores.get(namespace);
    console.assert(itemStore, 'Invalid ItemStore namespace: ' + namespace);
    return itemStore;
  }

  // TODO(burdon): Evolve into mutation dispatcher to QueryRegistry.
  onMutation(callback) {
    this._onMutation = callback;
    return this;
  }

  fireMuationNotification(context, items) {
    this._onMutation && this._onMutation(context, items);
  }

  /**
   * @returns {Promise}
   */
  search(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    logger.log($$('SEARCH[%s:%s]: %O', offset, count, filter));

    // TODO(madadam): TypeUtil or TypeRegistry.
    const getGroupKey = item => {
      switch (item.type) {
        case 'Task': {
          return item.project;
        }
      }
    };

    return this._searchAll(context, root, filter, offset, count)
      .then(items => {
        return filter.groupBy ? ItemUtil.groupBy(items, getGroupKey) : items;
      });
  }

  /**
   * Search across all query providers and merge the result.
   * Merge external items with items stored in the default store.
   *
   * @returns {Promise}
   */
  _searchAll(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    logger.log($$('SEARCH[%s:%s]: %O', offset, count, filter));

    // TODO(burdon): Unit test!

    //
    // Fan-out queries across all query providers.
    //
    let promises = _.map(Array.from(this._queryProcessors.values()), processor => {
      if (filter.namespace && processor.namespace != filter.namespace) {
        return Promise.resolve([]);
      }

      // TODO(madadam): Pagination over the merged result set. Need to over-fetch from each provider.
      return processor.queryItems(context, root, filter, offset, count)
        .then(items => {
          return {
            namespace: processor.namespace,
            items
          };
        })
        .catch(error => {
          console.warn('Query failed:', error);
        });
    });

    //
    // Join stored items with external items.
    //
    return Promise.all(promises)
      .then(results => {
        // Skip empty results (e.g., on error).
        results = _.compact(results);

        // Create a map of items that have foreign keys.
        // TODO(burdon): Requires stable external keys (google drive!)
        let itemsWithForeignKeys = new Map();

        // First get items from the current query that may have external references.
        let result = _.find(results, result => result.namespace === Database.NAMESPACE.USER);
        _.each(result.items, item => {
          if (item.fkey) {
            itemsWithForeignKeys.set(item.fkey, item);
          }
        });

        // Gather the set of foreign keys for external items.
        let foreignKeys = [];
        _.each(results, result => {
          if (result.namespace && Database.isExternalNamespace(result.namespace)) {
            _.each(result.items, item => {
              let fkey = ID.getForeignKey(item);
              if (!itemsWithForeignKeys.get(fkey)) {
                foreignKeys.push(fkey);
              }
            });
          }
        });

        // Load potentially matching items for external items.
        let loading = [];
        if (!_.isEmpty(foreignKeys)) {
          loading.push(this._getItemsWithForeignKeys(context, root, foreignKeys).then(items => {
            _.each(items, item => {
              console.assert(item.fkey);
              itemsWithForeignKeys.set(item.fkey, item);
            });
          }));
        }

        //
        // Wait for items to load, then join items with external items.
        //
        return Promise.all(loading).then(() => {

          // Merge external items with stored items.
          _.each(results, result => {
            if (result.namespace && Database.isExternalNamespace(result.namespace)) {
              _.each(result.items, item => {
                let existing = itemsWithForeignKeys.get(ID.getForeignKey(item));
                if (existing) {
                  // TODO(burdon): Better merge (e.g., replace title?)
                  console.log('MERGING: ' + JSON.stringify(existing));
                  _.defaults(existing, item);
                }
              });
            }
          });

          // Flatten the results and gather external items.
          // TODO(burdon): Better ranking, sorting, etc. And global rank across processors?
          let items = [];
          _.each(results, result => {
            _.each(result.items, item => {
              if (result.namespace && Database.isExternalNamespace(result.namespace)) {
                // If an item already exists, then it will be added above.
                let existing = itemsWithForeignKeys.get(ID.getForeignKey(item));
                if (!existing) {
                  items.push(item);
                }
              } else {
                // Add regular item.
                items.push(item);
              }
            });
          });

          return items;
        });
      });
  }

  /**
   * Gets items that reference the given foreign keys.
   *
   * @returns {Promise}
   * @private
   */
  _getItemsWithForeignKeys(context, root, foreignKeys) {
    let queryProcessor = this._queryProcessors.get(Database.NAMESPACE.USER);
    return queryProcessor.queryItems(context, root, {
      fkeys: foreignKeys
    });
  }
}

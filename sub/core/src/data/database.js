//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { ID } from './id';
import { ErrorUtil } from '../util/error';

import { ItemUtil, ItemStore, QueryProcessor } from './item_store';

import $$ from '../util/format';
import Logger from '../util/logger';

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
 * - Queries implicitly declare Buckets via the resolver context (which computes which buckets are accessible).
 */
export class Database {

  // Multi-group support.
  // TODO(burdon): Replace item with items (remove filter and require namespace).
  // TODO(burdon): Remove Database.getNamespaceForType: get namespace from ID (default to user). Add namespace to mutation sig.
  // TODO(burdon): ACLs: Reject lookup if context doesn't allow bucket.
  // TODO(burdon): Debug: list all items in cache; reset cache.
  // TODO(burdon): Support multiple groups (context, itemstore).

  // TODO(burdon): Move to resolver.
  static NAMESPACE = {
    SYSTEM:   'system',
    SETTINGS: 'settings',
    USER:     'user',
    LOCAL:    'local'
  };

  // TODO(burdon): Move to GraphQL.
  static GROUP_SPECS = {
    Task: {
      parentType:   'Project',
      parentKey:    'project',
      parentMember: 'tasks'
    }
  };

  static isExternalNamespace(namespace) {
    console.assert(_.isString(namespace));

    switch (namespace) {
      case Database.NAMESPACE.SYSTEM:
      case Database.NAMESPACE.SETTINGS:
      case Database.NAMESPACE.USER:
      case Database.NAMESPACE.LOCAL:
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

    this._resultMerger = new ResultMerger(this._queryProcessors);
  }

  /**
   * Register query processor for namespace.
   *
   * @param {QueryProcessor} queryProcessor
   * @return {Database}
   */
  registerQueryProcessor(queryProcessor) {
    console.assert(queryProcessor);
    logger.log('Registered QueryProcessor: ' + queryProcessor.namespace);
    console.assert(queryProcessor && queryProcessor.namespace);
    console.assert(!this._queryProcessors.get(queryProcessor.namespace), 'Already registered: ' + queryProcessor.namespace);
    this._queryProcessors.set(queryProcessor.namespace, queryProcessor);
    return this;
  }

  /**
   * Register item store for namespace.
   *
   * @param store
   * @returns {Database}
   */
  registerItemStore(store) {
    console.assert(store);
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
    console.assert(namespace);
    let queryProcessor = this._queryProcessors.get(namespace);
    console.assert(queryProcessor, 'Invalid QueryProcessor namespace: ' + namespace);
    return queryProcessor;
  }

  /**
   * @param namespace
   * @return {ItemStore}
   */
  getItemStore(namespace=Database.NAMESPACE.USER) {
    console.assert(namespace);
    let itemStore = this._stores.get(namespace);
    console.assert(itemStore, 'Invalid ItemStore namespace: ' + namespace);
    return itemStore;
  }

  onMutation(callback) {
    this._onMutation = callback;
    return this;
  }

  /**
   * Trigger mutation notifications.
   * @param context GraphQL request context.
   * @param itemMutations
   * @param items
   */
  fireMutationNotification(context, itemMutations, items) {
    this._onMutation && this._onMutation(context, itemMutations, items);
  }

  /**
   * @returns {Promise}
   */
  search(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    logger.log($$('SEARCH[%s:%s]: %O', offset, count, filter));

    let itemStore = this.getItemStore();
    return this._searchAll(context, root, filter, offset, count)
      .then(items => {
        return filter.groupBy ? ItemUtil.groupBy(itemStore, context, items, Database.GROUP_SPECS) : items
      });
  }

  /**
   * Search across all query providers and merge the result.
   * Merge external items with items stored in the default store.
   *
   * @returns {Promise}
   */
  _searchAll(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    logger.log($$('SEARCH[%s:%s]: %O', offset, count, filter));

    // TODO(burdon): Unit test!

    //
    // Fan-out queries across all query providers.
    //
    let promises = _.map(Array.from(this._queryProcessors.values()), queryProcessor => {
      if (filter.namespace && queryProcessor.namespace !== filter.namespace) {
        return Promise.resolve([]);
      }

      // TODO(madadam): Pagination over the merged result set. Need to over-fetch from each provider.
      return queryProcessor.queryItems(context, root, filter, offset, count)
        .then(items => {
          return {
            namespace: queryProcessor.namespace,
            items
          };
        })
        .catch(error => {
          logger.warn('Query failed: ' + ErrorUtil.message(error));
        });
    });

    return Promise.all(promises)
      .then(results => {
        return this._resultMerger.mergeResults(results, context, root);
      });
  }

}

/**
 * Join stored items with external items.
 */
export class ResultMerger {

  constructor(queryProcessors) {
    this._queryProcessors = queryProcessors;
  }

  /**
   *
   * @param results
   * @return {Promise.<TResult>}
   */
  mergeResults(results, context, root={}) {
    // Skip empty results (e.g., on error).
    results = _.compact(results);

    // TODO(madadam): Merge by regular (non-foreign key) ID too? e.g. SlackQueryProvider may return User items
    // from the SYSTEM store, should those be merged?

    // Create a map of items that have foreign keys.
    // TODO(burdon): Requires stable external keys (google drive!)
    let itemsWithForeignKeys = new Map();

    // First get items from the current query that may have external references.
    let result = _.find(results, result => result.namespace === Database.NAMESPACE.USER);
    if (result) {
      _.each(result.items, item => {
        if (item.fkey) {
          itemsWithForeignKeys.set(item.fkey, item);
        }
      });
    }

    // Gather the set of foreign keys for external items.
    let foreignKeys = [];
    _.each(results, result => {
      if (result.namespace && Database.isExternalNamespace(result.namespace)) {
        _.each(result.items, item => {
          // One more check on fkey, because query providers may return heterogeneous lists of items
          // from different namespaces, some may not have foreign keys.
          let fkey = ID.getForeignKey(item);
          if (fkey) {
            // Queue this up for a foreign-key lookup in the user store.
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
          // TODO(madadam): Merge instead of replace?
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
              this._merge(existing, item);
            }
          });
        }
      });

      // Flatten the results and gather external items.
      // TODO(burdon): Better ranking, sorting, etc. And global rank across processors?
      let items = [];
      let emittedKeys = new Map();
      _.each(results, result => {
        _.each(result.items, item => {
          let fkey = item.fkey || ID.getForeignKey(item);
          if (fkey) {
            if (emittedKeys.get(fkey)) {
              // Skip merged results that have already been emitted.
              return;
            }
            // Check if there's a merged item that hasn't been emitted yet, and emit that.
            let mergedItem = itemsWithForeignKeys.get(fkey);
            if (mergedItem) {
              emittedKeys.set(fkey, true);
              item = mergedItem;
            }
          }
          items.push(item);
        });
      });

      return items;
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

  _merge(obj, source) {
    ItemUtil.mergeItems(obj, source, [], ['id', 'namespace']);
    return obj;
  }
}

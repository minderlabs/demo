//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { $$, ID, Logger, ItemStore, QueryProcessor, TypeUtil } from 'minder-core';

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
export class Database extends ItemStore {

  // Multi-group support.
  // TODO(burdon): UpdateItemMutation multiple items. Map create/update IDs. Namespace.
  // TODO(burdon): Debug: list all items in cache; reset cache.

  // TODO(burdon): ID with optional namespace.
  // TODO(burdon): Path (optional namespace: e.g., for "system" namespace).
  // TODO(burdon): Remove Database.getNamespaceForType: get namespace from ID (default to user).
  // TODO(burdon): TestData/Randomizer set bucket. Set parent project.
  // TODO(burdon): System store return namespace.
  // TODO(burdon): Mutator take namespace.
  // TODO(burdon): Clean-up Database QP dispatch; and remove ItemStore interface.
  // TODO(burdon): UX add bucket from context. Add project to sub-tasks.
  // TODO(burdon): Reject lookup if context doesn't allow bucket.

  // TODO(burdon): Support multiple groups (context, itemstore).
  // TODO(burdon): Mutator reducer listen for all.

  static NAMESPACE = {
    SYSTEM:   'system',
    USER:     'user'
  };

  /**
   * Different types are stored in different stores.
   * @param type
   * @return {*}
   */
  // TODO(burdon): Remove.
  static getNamespaceForType(type) {
    switch (type) {
      case 'User':
      case 'Group':
        return Database.NAMESPACE.SYSTEM;

      default:
        return Database.NAMESPACE.USER;
    }
  }

  constructor(idGenerator, matcher) {
    super(idGenerator, matcher, '*');

    // ItemStores keyed by type.
    // TODO(burdon): Should be by domain?
    this._stores = new Map();

    // SearchProviders Keyed by namespace.
    this._queryProcessors = new Map();

    // Callback.
    this._onMutation = null;
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

  getItemStore(namespace=Database.NAMESPACE.USER) {
    let itemStore = this._stores.get(namespace);
    console.assert(itemStore, 'Invalid namespace: ' + namespace);
    return itemStore;
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
  // TODO(burdon): Database shouldn't implement ItemStore.
  // TODO(burdon): Passing namespace isn't right (instead get the store).
  //

  getItem(context, type, itemId, namespace) {
    return this.getItems(context, type, [itemId], namespace).then(items => items[0]);
  }

  upsertItem(context, item, namespace) {
    return this.upsertItems(context, [item], namespace).then(items => items[0]);
  }

  //
  // ItemStore API.
  //

  /**
   * @returns {Promise}
   */
  upsertItems(context, items, namespace=Database.NAMESPACE.USER) {
    logger.log($$('UPSERT: %s', items.length > 1 ? TypeUtil.stringify(items) : JSON.stringify(items)));

    // TODO(burdon): Security: check bucket/ACLs and namespace privilege.
    // TODO(burdon): Dispatch to store (check permissions).
    let itemStore = this.getItemStore(namespace);
    return itemStore.upsertItems(context, items).then(modifiedItems => {

      // Invalidate clients.
      this.handleMutation(context, modifiedItems);

      return modifiedItems;
    });
  }

  /**
   * @returns {Promise}
   */
  getItems(context, type, itemIds, namespace=Database.NAMESPACE.USER) {
    logger.log($$('GET[%s]: [%s]', type, itemIds));

    let itemStore = this.getItemStore(namespace);
    return itemStore.getItems(context, type, itemIds);
  }

  /**
   * @returns {Promise}
   */
  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    logger.log($$('QUERY[%s:%s]: %O', offset, count, filter));

    // TODO(burdon): Security?
    let itemStore = this.getItemStore(filter.namespace);
    return itemStore.queryItems(context, root, filter, offset, count);
  }

  /**
   * @returns {Promise}
   */
  search(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    logger.log($$('SEARCH[%s:%s]: %O', offset, count, filter));

    return this._searchAll(context, root, filter, offset, count)
      .then(items => {
        return filter.groupBy ? this._groupBy(items) : items;
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
          if (result.namespace !== Database.NAMESPACE.USER) {
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
          loading.push(this._queryItemsWithForeignKeys(context, root, foreignKeys).then(items => {
            _.each(items, item => {
              console.assert(item.fkey);
              itemsWithForeignKeys.set(item.fkey, item);
            });
          }));
        }

        // Wait for items to load...
        return Promise.all(loading).then(() => {

          // Merge external items with stored items.
          _.each(results, result => {
            _.each(result.items, item => {
              if (result.namespace !== Database.NAMESPACE.USER) {
                let existing = itemsWithForeignKeys.get(ID.getForeignKey(item));
                if (existing) {
                  // TODO(burdon): Better merge (e.g., replace title?)
                  console.log('MERGING: ' + JSON.stringify(existing));
                  _.defaults(existing, item);
                }
              }
            });
          });

          // Flatten the results and gather external items.
          // TODO(burdon): Better ranking, sorting, etc. And global rank across processors?
          let items = [];
          _.each(results, result => {
            _.each(result.items, item => {
              if (result.namespace === Database.NAMESPACE.USER) {
                items.push(item);
              } else {
                // If an item already exists, then it will be added above.
                let existing = itemsWithForeignKeys.get(ID.getForeignKey(item));
                if (!existing) {
                  items.push(item);
                }
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
  _queryItemsWithForeignKeys(context, root, foreignKeys) {
    let defaultProcessor = this._queryProcessors.get(Database.NAMESPACE.USER);
    return defaultProcessor.queryItems(context, root, {
      fkeys: foreignKeys
    });
  }

  /**
   * Groups search results by common parents.
   *
   * @param items
   * @returns {[Item]} ordered item results.
   * @private
   */
  _groupBy(items) {

    // TODO(burdon): Reimplement grouping using search items.
    // Currently item.refs pollutes the apollo client cache (since depends on search context).

    let itemsById = new Map();

    //
    // Create a map of items arrays indexed by common group item ID.
    //

    let groupedItems = new Map();
    _.each(items, item => {
      itemsById.set(item.id, item);
      let groupItemId = Database.groupItemId(item);
      if (groupItemId) {
        TypeUtil.defaultMap(groupedItems, groupItemId, Array).push(item);
      }
    });

    //
    // Create groups.
    //

    let itemGroups = new Map();
    groupedItems.forEach((items, groupItemId) => {
      if (items.length > 1) {
        // Check if grouped parent is actually part of the results.
        let groupItem = itemsById.get(groupItemId);
        if (!groupItem) {
          // TODO(burdon): Look-up the item.
          // TODO(burdon): Generalize for other types.
          groupItem = {
            id: groupItemId,
            type: 'Project',
            title: 'Project ' + groupItemId
          };
        }

        groupItem.refs = items;
        itemGroups.set(groupItemId, groupItem);
      }
    });

    //
    // Create the ordered results.
    //

    let results = [];
    _.each(items, item => {
      // Check if the item has already been listed (e.g., as part of a group).
      if (itemsById.get(item.id)) {
        // Get the group (either current item or parent of current item).
        let group = itemGroups.get(item.id) || itemGroups.get(Database.groupItemId(item));
        if (group) {
          // Add group.
          results.push(group);

          // Remove each grouped item.
          _.each(group.refs, item => { itemsById.delete(item.id); });
        } else {
          // Add plain item.
          results.push(item);
        }

        // Don't use again.
        itemsById.delete(item.id);
      }
    });

    return results;
  }

  // TODO(madadam): TypeUtil or TypeRegistry.
  static groupItemId(item) {
    switch (item.type) {
      case 'Task': {
        return item.project;
      }
    }
  }
}

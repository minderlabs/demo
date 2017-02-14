//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { $$, ID, Logger, ItemStore, TypeUtil } from 'minder-core';

const logger = Logger.get('db');

/**
 * Base database implementation.
 */
export class Database extends ItemStore {

  static DEFAULT_NAMESPACE = '*';

  constructor(idGenerator, matcher) {
    super(idGenerator, matcher);

    // ItemStores keyed by type.
    // TODO(burdon): Should be by domain?
    this._stores = new Map();

    // SearchProviders Keyed by namespace.
    this._queryProcessors = new Map();

    // Callback.
    this._onMutation = null;
  }

  /**
   * Register fan-out stores.
   *
   * @param store
   * @param type
   * @returns {Database}
   */
  registerItemStore(store, type='*') {
    console.assert(type && store);
    console.assert(!this._stores.get(type), 'Already registered: ' + type);
    this._stores.set(type, store);
    return this;
  }

  /**
   *
   * @param {QueryProcessor} processor
   * @return {Database}
   */
  registerQueryProcessor(processor) {
    // TODO(burdon): Maintain order.
    console.assert(processor && processor.namespace);
    console.assert(!this._queryProcessors.get(processor.namespace), 'Already registered: ' + processor.namespace);
    this._queryProcessors.set(processor.namespace, processor);
    return this;
  }

  getItemStore(type) {
    return this._stores.get(type) || this._stores.get(Database.DEFAULT_NAMESPACE);
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
    let itemStore = this.getItemStore(Database.DEFAULT_NAMESPACE);
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
    return itemStore.getItems(context, type, itemIds);
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
  _searchAll(context, root, filter={}, offset=0, count=10) {
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

        // Create a map of items that have foreign keys.
        // TODO(burdon): Requires stable external keys (google drive!)
        let itemsWithForeignKeys = new Map();

        // First get items from the current query that may have external references.
        let result = _.find(results, result => result.namespace == Database.DEFAULT_NAMESPACE);
        _.each(result.items, item => {
          if (item.fkey) {
            itemsWithForeignKeys.set(item.fkey, item);
          }
        });

        // Gather the set of foreign keys for external items.
        let foreignKeys = [];
        _.each(results, result => {
          if (result.namespace !== Database.DEFAULT_NAMESPACE) {
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

        // Process the results.
        return Promise.all(loading).then(() => {

          // Merge external items with stored items.
          _.each(results, result => {
            _.each(result.items, item => {
              if (result.namespace !== Database.DEFAULT_NAMESPACE) {
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
              if (result.namespace === Database.DEFAULT_NAMESPACE) {
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
    let defaultProcessor = this._queryProcessors.get(Database.DEFAULT_NAMESPACE);
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

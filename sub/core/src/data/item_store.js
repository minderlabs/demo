//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { TypeUtil } from '../util/type';

/**
 * Abstract base class.
 *
 * NOTE: QueryProcessor is separate from ItemStore since may be implemented by different server (e.g., ElasticSearch).
 */
export class QueryProcessor {

  // TODO(burdon): Support multiple groups.
  static getBuckets(context) {
    let { groupId, userId } = context;
    return _.compact([ groupId, userId ]);
  }

  static DEFAULT_COUNT = 20;

  /**
   * @param namespace Namespace in filter and get/set operations routes to the specified QueryProcessor/ItemStore.
   */
  constructor(namespace) {
    console.assert(_.isString(namespace));
    this._namespace = namespace;
  }

  get namespace() {
    return this._namespace;
  }

  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    throw new Error('Not implemented');
  }
}

/**
 * Abstract base class.
 */
export class ItemStore extends QueryProcessor {

  // TODO(burdon): Don't extend QueryProcessor.
  // TODO(burdon): Implment basic Keyscan lookup (e.g., Type-only).

  /**
   * @param namespace Namespace.
   * @param buckets If true, then checks items have buckets.
   */
  constructor(namespace, buckets=false) {
    super(namespace);
    this._buckets = buckets;
  }

  getItem(context, type, itemId) {
    return this.getItems(context, type, [itemId]).then(items => items[0]);
  }

  upsertItem(context, item) {
    return this.upsertItems(context, [item]).then(items => items[0]);
  }

  getItems(context, type, itemIds) {
    throw new Error('Not implemented');
  }

  upsertItems(context, items) {
    throw new Error('Not implemented');
  }
}

/**
 * Wraps another ItemStore.
 */
export class DelegateItemStore extends ItemStore {

  constructor(itemStore) {
    super(itemStore.namespace);
    this._itemStore = itemStore;
  }

  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    return this._itemStore.queryItems(context, root, filter, offset, count);
  }

  getItems(context, type, itemIds) {
    return this._itemStore.getItems(context, type, itemIds);
  }

  upsertItems(context, items) {
    return this._itemStore.upsertItems(context, items);
  }
}

/**
 * Wrapper for item filtering and sorting.
 */
export class ItemUtil {

  /**
   * Sort items.
   * @param items
   * @param filter
   * @return {*}
   */
  static sortItems(items, filter) {
    let orderBy = filter.orderBy;
    if (orderBy) {
      console.assert(orderBy.field);
      items = _.orderBy(items, [orderBy.field], [orderBy.order === 'DESC' ? 'desc' : 'asc']);
    }

    return items;
  }

  /**
   * Groups search results by common parents.
   *
   * @param items
   * @param getGroupKey Function that returns group key for the item.
   * @returns {[Item]} ordered item results.
   * @private
   */
  static groupBy(items, getGroupKey) {

    // TODO(burdon): Reimplement grouping using search items.
    // Currently item.refs pollutes the apollo client cache (since depends on search context).

    let itemsById = new Map();

    //
    // Create a map of items arrays indexed by common group item ID.
    //

    let groupedItems = new Map();
    _.each(items, item => {
      itemsById.set(item.id, item);
      let groupItemId = getGroupKey(item);
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
        let group = itemGroups.get(item.id) || itemGroups.get(getGroupKey(item));
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

  constructor(idGenerator, matcher) {
    console.assert(idGenerator && matcher);
    this._idGenerator = idGenerator;
    this._matcher = matcher;
  }

  /**
   * Update the timestamps and set ID if create.
   * @param item
   * @return {*}
   */
  onUpdate(item) {
    console.assert(item && item.type, 'Invalid item: ' + JSON.stringify(item));

    let ts = moment().unix();
    if (!item.id) {
      item.id = this._idGenerator.createId();
      item.created = ts;
    }

    item.modified = ts;
    return item;
  }

  /**
   * Filter and sort list of items.
   *
   * @param itemIterator
   * @param context
   * @param root
   * @param filter
   * @param offset
   * @param count
   * @returns {Array}
   */
  // TODO(burdon): Rename filter and sort.
  filterItems(itemIterator, context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    let items = [];

    // Match items.
    itemIterator.forEach(item => {
      if (this._matcher.matchItem(context, root, filter, item)) {
        items.push(item);
      }
    });

    // Sort.
    items = ItemUtil.sortItems(items, filter);

    // Page.
    items = _.slice(items, offset, offset + count);

    return items;
  }
}

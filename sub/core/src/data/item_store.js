//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { TypeUtil } from '../util/type';

import { ID } from './id';
import { Transforms } from './transforms';


/**
 * Abstract base class.
 *
 * NOTE: QueryProcessor is separate from ItemStore since may be implemented by different server (e.g., ElasticSearch).
 */
export class QueryProcessor {

  /**
   * Get buckets from the context.
   * @param context
   * @returns [{string}] Unordered array of buckets.
   */
  static getBuckets(context) {
    let { userId, groupIds } = context;
    return _.compact(_.concat(userId, groupIds));
  }

  // TODO(burdon): Remove.
  static DEFAULT_COUNT = 20;

  /**
   * @param namespace Namespace in filter and get/set operations routes to the specified QueryProcessor/ItemStore.
   */
  constructor(namespace) {
    console.assert(_.isString(namespace), 'Invalid namespace: ' + namespace);
    this._namespace = namespace;
  }

  get namespace() {
    return this._namespace;
  }

  /**
   *
   * @param context
   * @param root
   * @param filter
   * @return {Promise<[Item]>} Retrieved items or [].
   */
  // TODO(burdon): Document root (see Matcher.matchComparatorExpression and ExpressionInput).
  queryItems(context, root={}, filter={}) {
    throw new Error('Not implemented');
  }
}

/**
 * Abstract base class.
 */
export class ItemStore extends QueryProcessor {

  // TODO(burdon): Don't extend QueryProcessor.
  // TODO(burdon): Implment basic Keyscan lookup (e.g., Type-only) and replace current getItems().

  /**
   * @param namespace Namespace.
   * @param buckets If true, then checks items have buckets.
   */
  constructor(namespace, buckets=false) {
    super(namespace);
    this._buckets = buckets;
  }

  /**
   *
   * @param context
   * @param type
   * @param itemId
   * @return {Promise<Item>} Item or null.
   */
  getItem(context, type, itemId) {
    console.assert(itemId, 'Invalid ID: ' + itemId);
    return this.getItems(context, type, [itemId]).then(items => items[0]);
  }

  /**
   *
   * @param context
   * @param item
   * @return {Promise<Item>} Updated item.
   */
  upsertItem(context, item) {
    return this.upsertItems(context, [item]).then(items => items[0]);
  }

  /**
   *
   * @param context
   * @param type
   * @param itemIds
   * @return {Promise<[Item]>} Retrieved items or [].
   */
  getItems(context, type, itemIds=[]) {
    throw new Error('Not implemented');
  }

  /**
   *
   * @param context
   * @param items
   * @return {Promise<[Item]>} Updated items.
   */
  upsertItems(context, items) {
    throw new Error('Not implemented');
  }

  /**
   * Processes the item mutations, creating and updating items.
   *
   * @param itemStore
   * @param context
   * @param itemMutations
   * @return {Promise<[Item]>}
   */
  static applyMutations(itemStore, context, itemMutations) {
    console.assert(itemStore && context && itemMutations);

    return Promise.all(_.map(itemMutations, itemMutation => {
      let { itemId, mutations } = itemMutation;
      let { type, id:localId } = ID.fromGlobalId(itemId);

      //
      // Get and update item.
      // TODO(burdon): Relies on getItem to return {} for not found.
      //
      return itemStore.getItem(context, type, localId)
        .then(item => {

          // If not found (i.e., insert).
          // TODO(burdon): Check this is an insert (not a miss due to a bug); use version?
          if (!item) {
            item = {
              id: localId,
              type: type
            };
          }

          //
          // Apply mutations.
          //
          return Transforms.applyObjectMutations(item, mutations);
        });
    }))

      //
      // Upsert items.
      //
      .then(results => {
        let items = TypeUtil.flattenArrays(results);
        return itemStore.upsertItems(context, items)
      });
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

  queryItems(context, root={}, filter={}) {
    return this._itemStore.queryItems(context, root, filter);
  }

  getItems(context, type, itemIds=[]) {
    return this._itemStore.getItems(context, type, itemIds);
  }

  upsertItems(context, items) {
    return this._itemStore.upsertItems(context, items);
  }
}

/**
 * Base ItemStore.
 */
export class BaseItemStore extends ItemStore {

  constructor(idGenerator, matcher, namespace, buckets) {
    super(namespace, buckets);
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
    console.assert(item && item.type, 'Invalid item: ' + TypeUtil.stringify(item));

    // Client created items set the ID.
    if (!item.id) {
      item.id = this._idGenerator.createId();
    }

    // Standard metadata.
    let ts = moment().unix();
    _.defaults(item, {
      created: ts,
      modified: ts
    });

    return item;
  }

  /**
   * Filter and sort list of items.
   *
   * @param itemIterator
   * @param context
   * @param root
   * @param filter
   * @returns {Array}
   */
  // TODO(burdon): Rename filter and sort.
  filterItems(itemIterator, context, root={}, filter={}) {
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
    let { offset=0, count=ItemStore.DEFAULT_COUNT } = filter;
    items = _.slice(items, offset, offset + count);

    return items;
  }
}

/**
 * Item Utils.
 */
export class ItemUtil {

  /**
   * Get a map of items by a particular field.
   * @param {[Item]} items
   * @param {string} path
   * @returns {Map}
   */
  static createItemMap(items, path='id') {
    let itemMap = new Map();
    _.each(items, item => {
      let key = _.get(item, path);
      if (key === undefined) {
        return;
      }

      let existing = itemMap.get(key);
      if (existing) {
        console.warn(`Duplicate key[${key}]:`, existing.id, item.id);
      }

      itemMap.set(key, item);
    });

    return itemMap;
  }

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
   * Clear fields from an item, in place.
   * @param item
   * @param fields array of field names to clear from item.
   * @return item original item
   */
  static clearFields(item, fields=[]) {
    // NOTE: Don't use _.omit because it would a copy of item, and we want to merge in place.
    _.each(fields, field => _.unset(item, field));
    return item;
  }

  /**
   * Merge source into item, in place.
   * @param item
   * @param source
   * @param omitFields array of field names to omit from source when merging.
   * @return Merged item.
   */
  static mergeItems(item, source, omitFields=[]) {
    return _.merge(item, _.omit(_.omitBy(source, _.isNil), omitFields));
  };

  /**
   * Groups search results by common parents.
   * E.g., Tasks are groups into the parent Project.
   *
   * @param context
   * @param itemStore
   * @param items
   * @param groupSpecs Map of Type => { parentType, parentKey, parentMember }
   * @returns {Promise<[Item]>} ordered item results.
   */
  static groupBy(itemStore, context, items, groupSpecs) {
    console.assert(itemStore && context && items && groupSpecs);

    // Map of items being processed.
    let itemsById = new Map();

    //
    // Create a map of item arrays indexed by common group item ID.
    //

    let itemsByGroupId = new Map();
    _.each(items, item => {
      itemsById.set(item.id, item);

      let spec = groupSpecs[item.type];
      let groupItemId = spec && item[spec.parentKey];
      if (groupItemId) {
        TypeUtil.defaultMap(itemsByGroupId, groupItemId, Array).push(item);
      }
    });

    //
    // Create groups.
    //

    let missingGroupItemsByType = new Map();

    let groupItemsById = new Map();
    itemsByGroupId.forEach((items, groupItemId) => {
      let spec = groupSpecs[items[0].type];
      console.assert(spec);

      // Check if grouped parent is actually part of the results.
      let groupItem = itemsById.get(groupItemId);
      if (!groupItem) {

        // Create stub and look-up later.
        groupItem = {
          title: '### ERROR ###',     // Will be replaced by referenced item.
          type: spec.parentType,
          id: groupItemId
        };

        TypeUtil.defaultMap(missingGroupItemsByType, spec.parentType, Array).push(groupItem);
      }

      // Set the child items.
      groupItem[spec.parentMember] = items;
      groupItemsById.set(groupItemId, groupItem);
    });

    //
    // Create the ordered results.
    //

    const getResults = (items) => {

      let results = [];
      _.each(items, item => {

        // Check if the item has already been listed (e.g., as part of a group).
        // NOTE: We remove from this map once they are listed in the results.
        if (itemsById.get(item.id)) {

          // Check if the result is a group item.
          let groupItem = groupItemsById.get(item.id);

          // If not, check if we are a member of a group item.
          if (!groupItem) {
            let spec = groupSpecs[item.type];
            let groupItemId = spec && item[spec.parentKey];
            if (groupItemId) {
              groupItem = groupItemsById.get(groupItemId);
            }
          }

          // If we have a group item, add it to the results and remove the children.
          if (groupItem) {

            // Add the group item.
            results.push(groupItem);

            // Don't use again.
            itemsById.delete(groupItem.id);

            // Remove grouped items.
            // NOTE: May have multiple groups.
            _.each(groupSpecs, (spec, type) => {
              if (spec.parentType === groupItem.type) {
                _.each(groupItem[spec.parentMember], item => {
                  itemsById.delete(item.id);
                });
              }
            });
          } else {

            // Add regular item.
            results.push(item);

            // Don't use again.
            itemsById.delete(item.id);
          }
        }
      });

      return results;
    };

    //
    // Look-up missing items.
    //

    if (missingGroupItemsByType.size) {
      let promises = [];

      missingGroupItemsByType.forEach((items, type) => {
        promises.push(itemStore.getItems(context, type, _.map(items, item => item.id)));
      });

      return Promise.all(promises).then(results => {
        _.each(results, items => {
          _.each(items, item => {

            // Get the stub created above.
            let groupItemStub = groupItemsById.get(item.id);
            console.assert(groupItemStub);

            // Merge collections onto real results.
            _.each(groupSpecs, (spec, type) => {
              if (spec.parentType === item.type) {
                item[spec.parentMember] = groupItemStub[spec.parentMember];
              }
            });

            // Set the actual item.
            groupItemsById.set(item.id, item);
          });
        });

        return getResults(items);
      });
    } else {
      return Promise.resolve(getResults(items));
    }
  }
}

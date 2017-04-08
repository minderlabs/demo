//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { TypeUtil } from '../util/type';

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
   * @param groupSpecs Map of { Type => { parentType, parentKey, parentMember } }
   * @returns {Promise<[{Grouped}]>} ordered item results.
   */
  static groupBy(itemStore, context, items, groupSpecs) {
    console.assert(itemStore && context && items && groupSpecs);

    // TODO(burdon): Do client-side grouping; server-side should just fetch required items; include in search result.
    // TODO(burdon): GroupBy should not collect in the parent Project since this will bust the cache.
    // E.g., Projects with a limited set of groups.

    // Map of items being processed.
    let itemsById = new Map();

    // Map of grouped items by field.
    // { ParentID => { Spec => [Item] } }
    let groupedItemsByParentId = new Map();

    //
    // Create a map of item arrays indexed by common group item ID.
    // ID => [ITEM]
    //

    _.each(items, item => {
      itemsById.set(item.id, item);

      let spec = groupSpecs[item.type];
      let parentItemId = spec && item[spec.parentKey];
      if (parentItemId) {
        let fieldMap = TypeUtil.defaultMap(groupedItemsByParentId, parentItemId, Map);
        TypeUtil.defaultMap(fieldMap, spec, Array).push(item);
      }
    });

    // Map of { Type => [ID] }
    // Track parents not included in the results neeeded for grouping.
    let missingParentIDsByType = new Map();

    // Map of parent items.
    let parentItemsById = new Map();

    //
    // Create Maps of parents and missing parents by type.
    //
    groupedItemsByParentId.forEach((groupedItemsBySpec, parentId) => {
      // Check if grouped parent is actually part of the results.
      let parent = itemsById.get(parentId);
      if (parent) {
        parentItemsById.set(parent.id, parent);
      } else {
        // Check all specs are for the same parent type.
        let specs = _.uniqBy(_.toArray(groupedItemsBySpec.keys()), spec => spec.parentType);
        console.assert(specs.length === 1);
        TypeUtil.defaultMap(missingParentIDsByType, specs[0].parentType, Array).push(parentId);
      }
    });

    //
    // Callback to create the ordered [GroupedItem] results.
    //
    const getResults = (items) => {

      let groupedItemResults = [];
      _.each(items, item => {

        // Check if the item has already been listed (e.g., as part of a group).
        // NOTE: We remove from this map once they are listed in the results.
        if (itemsById.get(item.id)) {

          // Check if the result is a group item.
          let parentItem = parentItemsById.get(item.id);

          // If not, check if we are a member of a group and if so, promote the parent group item.
          if (!parentItem) {
            let spec = groupSpecs[item.type];
            let parentItemId = spec && item[spec.parentKey];
            if (parentItemId) {
              parentItem = parentItemsById.get(parentItemId);
            }
          }

          // If we have a parent group item, add it to the results and remove the children.
          if (parentItem) {
            let groupedItem = {
              id: parentItem.id
            };

            // Set the grouped items.
            _.each(groupSpecs, (spec, type) => {
              if (spec.parentType === parentItem.type) {
                let groupedItems = groupedItemsByParentId.get(parentItem.id).get(spec);

                TypeUtil.getOrSet(groupedItem, 'groups', []).push({
                  field: spec.parentMember,
                  ids: _.map(groupedItems, item => item.id)
                });

                // Don't use grouped items again.
                _.each(groupedItems, item => {
                  itemsById.delete(item.id);
                });
              }
            });

            // Add the grouped item
            groupedItemResults.push(groupedItem);

            // Don't use again.
            itemsById.delete(parentItem.id);
          } else {

            // Add the non-grouped regular item.
            groupedItemResults.push({
              id: item.id
            });

            // Don't use again.
            itemsById.delete(item.id);
          }
        }
      });

      return groupedItemResults;
    };

    //
    // Look-up missing items.
    //

    if (missingParentIDsByType.size === 0) {
      return Promise.resolve(getResults(items));
    } else {

      // Load missing items.
      let promises = [];
      missingParentIDsByType.forEach((ids, type) => {
        promises.push(itemStore.getItems(context, type, ids));
      });

      return Promise.all(promises).then(itemsSets => {

        _.each(itemsSets, itemSet => {
          _.each(itemSet, item => {
            parentItemsById.set(item.id, item);
          });
        });

        return getResults(items);
      });
    }
  }
}

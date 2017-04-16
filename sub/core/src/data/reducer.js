//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import update from 'immutability-helper';

import Logger from '../util/logger';

import { ID } from './id';
import { MutationUtil } from './mutations';

const logger = Logger.get('reducer');

/**
 * { items: $remove: [item] }
 * @returns new array.
 */
update.extend('$remove', (removeItems, items) => {
  return _.filter(items, item => !_.find(removeItems, remove => remove.id === item.id));
});

//
// In general, Apollo cannot know how to update its cache after a mutation.
// It's a trivial matter when an Item is updated: it checks for fields declared in the query and if any of these
// have changed, it updates the associated item. But there are cases where it can't know:
// 1). The query contains a filter and the mutation changes the match of the item to the filter.
// 2). The query has nested items.
// The Apollo framework has escape hatches to solve this; the most flexible is the reducer call back of the
// graphql(Query).options definition.
//
// For simple queries (i.e., against a flat list of items), we can inject the Matcher and attempt to match
// the mutated item against the current filter (see below).
// - In the case that a mutated item still matches the query's filter we do nothing and the framework updates
//   the cache for us.
// - In the case that the item no longer matches the filter, we manually remove it.
// - In the case that the item doesn't exist in the current cache, we add it.
//
// Consider a complex query (e.g., for the Group detail page):
//   Group() { items { title ... GroupFragment { members { title tasks({ assignee }) { title } } } } }
//   "Get the Tasks assigned to each Member of the Group".
//
// We need to tell the reducer how to find the appropriate sub-collection (e.g., Member A's tasks).
// NOTE: Mutations must also return all relevant fields for the type.
//
// NOTE: If we get this right, things should work offline.
//

// TODO(burdon): Holy-grail would be to introspect the query and do this automatically (DESIGN DOC).

// TODO(burdon): Multiple queries bound with different (filter) values.
// Remove stopped queries from store and internal tracking.
// https://github.com/minderlabs/demo/pull/52
// https://github.com/apollostack/apollo-client/issues/903
// https://github.com/apollostack/apollo-client/pull/1054 [partially resolved]
// http://dev.apollodata.com/react/cache-updates.html#resultReducers

/**
 * Base class for reducers.
 *
 * The Reducer is called on mutation. When the generic UpsertItemsMutation response is received we need
 * to tell Apollo how to stitch the result into the cached response. For item mutations, this is easy
 * since the ID is used to change the existing item. For adds and deletes, Apollo has no way of knowing
 * where the item should fit (e.g., for a flat list it depends on the sort order; for complex query shapes
 * (like Group) it could be on one (or more) of the branches (e.g., Second member's tasks).
 */
export class Reducer {

  /**
   * const MyReducer = new ListReducer(Query);
   *
   * compose(
   *   graphql(Query, {
   *     options: (props) => {
   *       return {
   *         reducer: Reducer.callback(MyReducer)
   *       };
   *     }
   *   })
   * )
   */
  static callback(reducer, props) {
    return (previousResult, action) => {
      let updatedItems = MutationUtil.getUpsertItemsMutationResult(action);
      let newResult = updatedItems && reducer.applyMutations(props, previousResult, updatedItems);
      return newResult || previousResult;
    };
  }

  constructor(path) {
    console.assert(path);
    this._path = path;
  }

  get path() {
    return this._path;
  }

  getResult(data) {
    return _.get(data, this._path);
  }

  applyMutations(props, previousResult, updatedItems) {
    return previousResult;
  }

  update(previousResult, updateSpec=undefined) {
    console.assert(previousResult);
    if (updateSpec) {
      logger.log('Update[' + this.name + ']: ' + JSON.stringify(updateSpec));
      return update(previousResult, updateSpec);
    } else {
      return previousResult;
    }
  }
}

/**
 * Insert, remove, replace items in list.
 * May be nested within parent Reducer.
 */
export class ListReducer extends Reducer {

  constructor(path) {
    super(path);
  }

  applyMutations(props, previousResult, updatedItems) {
    return this.update(previousResult, this.createUpdateSpec(props, previousResult, updatedItems));
  }

  createUpdateSpec(props, previousResult, updatedItems) {
    let { matcher, context, filter } = props;
    console.assert(matcher && context && filter);

    // Items in current result.
    let previousItems = this.getResult(previousResult);

    let spliceItems = [];
    let removeItems = [];
    let appendItems = [];

    //
    // Process each updated item.
    //
    _.each(updatedItems, updatedItem => {
      let exists = _.find(previousItems, previousItem => previousItem.id === updatedItem.id);

      // Merge if updated item's foreign key matches a previous item.
      // This happens when an external item is cloned due to a mutation.
      if (!exists && updatedItem.fkey) {
        let replaceIdx = _.findIndex(previousItems,
          previousItem => previousItem.namespace && ID.getForeignKey(previousItem) === updatedItem.fkey);

        if (replaceIdx !== -1) {
          spliceItems.push([ replaceIdx, 1, updatedItem ]);
          return true;
        }
      }

      // Remove if updated item doesn't match the filter.
      let match = matcher.matchItem(context, {}, filter, updatedItem);
      if (!match) {
        removeItems.push(updatedItem);
        return true;
      }

      // TODO(burdon): Sort order from filter.
      // Append if updated item currently doesn't exist in result.
      if (!exists) {
        appendItems.push(updatedItem);
        return true;
      }

      // Do nothing if just and update.
    });

    let updateItems = {};

    if (!_.isEmpty(spliceItems)) {
      _.assign(updateItems, {
        $splice: spliceItems
      });
    }
    if (!_.isEmpty(removeItems)) {
      _.assign(updateItems, {
        $remove: removeItems
      });
    }
    if (!_.isEmpty(appendItems)) {
      _.assign(updateItems, {
        $push: appendItems
      });
    }

    if (!_.isEmpty(updateItems)) {
      return _.set({}, this._path, updateItems);
    }
  }
}

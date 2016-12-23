//
// Copyright 2016 Minder Labs.
//

import { graphql } from 'react-apollo';
import update from 'immutability-helper';

import $$ from '../util/format';
import Logger from '../util/logger';

const logger = Logger.get('reducer');

//
// Custom helper commands.
// https://github.com/kolodny/immutability-helper
// https://facebook.github.io/react/docs/update.html#available-commands
//

update.extend('$remove', (updatedItem, items) => {
  return _.filter(items, item => item.id !== updatedItem.id);
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

// TODO(burdon): Unit tests.
// TODO(burdon): ISSUE: Are all queries' reducers called for all mutations?

// TODO(burdon): Resolve:
// https://github.com/apollostack/apollo-client/issues/903
// http://dev.apollodata.com/react/cache-updates.html#resultReducers

/**
 * Base class for reducers.
 *
 * The reducer updates the cache after a mutation occurs (both optimistic results and results from the server).
 */
class Reducer {

  constructor(mutation, query, path) {
    console.assert(mutation && query && path);
    console.assert(_.isString(path));

    // NOTE: The current implementation assumes a common mutation (i.e., UpdateItemMutation).
    this._mutation = mutation;
    this._query = query;
    this._path = path;
  }

  get mutation() {
    return this._mutation;
  }

  get query() {
    return this._query;
  }

  /**
   * Returns the mutated item (or null).
   * @param action
   * @returns {Item}
   */
  getMutatedItem(action) {
    let mutationName = this._mutation.definitions[0].name.value;
    if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === mutationName) {
      // TODO(burdon): Must match mutation (make customizable).
      return action.result.data.updateItem;
    }
  }

  doTransform(previousResult, transform) {
    console.assert(previousResult && transform);
//  logger.log($$('Transform: %o: %s', previousResult, JSON.stringify(transform, 0, 2)));
    return update(previousResult, transform);
  }
}

/**
 * the List Reducer updates the currently cached list items based on the mutation.
 */
export class ListReducer extends Reducer {

  constructor(mutation, query, path) {
    super(mutation, query, path);
  }

  getItems(data) {
    return _.get(data, this._path, []);
  }

  /**
   * Execute the reducer.
   *
   * @param context
   * @param matcher
   * @param filter
   * @param previousResult
   * @param action
   *
   * @returns {*} Updated cache result.
   */
  reduceItems(context, matcher, filter, previousResult, action) {
    let result = previousResult;

    let updatedItem = this.getMutatedItem(action);
    if (updatedItem) {
      let queryName = this._query.definitions[0].name.value;
      logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

      let transform = this.getTransform(context, matcher, filter, previousResult, updatedItem);
      if (transform) {
        result = this.doTransform(previousResult, transform);
      }
    }

    return result;
  }

  /**
   * Get the default list transformation.
   *
   * @param context
   * @param matcher
   * @param filter
   * @param previousResult
   * @param updatedItem
   * @returns {object} Transform function.
   */
  getTransform(context, matcher, filter, previousResult, updatedItem) {
    logger.log($$('Update items: %o', previousResult));

    // TODO(burdon): Is the root item needed?
    // Determine if the mutated item matches the filter.
    let match = matcher.matchItem(context, {}, filter, updatedItem);

    // Determine if the item matches and is new, otherwise remove it.
    // NOTE: do nothing if it's just an update.
    let items = _.get(previousResult, this._path);
    let insert = match && _.findIndex(items, item => item.id === updatedItem.id) === -1;
    if (insert) {
      // TODO(burdon): Preserve sort order (if set, otherwise top/bottom of list).
      return { [this._path]: { $push: [ updatedItem ] } };
    } else if (!match) {
      return { [this._path]: { $remove: updatedItem } };
    }
  }
}

/**
 * The item Reducer updates the cached item (which may have a complex shape).
 */
export class ItemReducer extends Reducer {

  constructor(mutation, query, reducer=null, path='item') {
    super(mutation, query, path);

    // TODO(burdon): Extend or inject?
    this._reducer = reducer;
  }

  getItem(data) {
    return _.get(data, this._path);
  }

  /**
   * Execute the reducer.
   *
   * @param context
   * @param matcher
   * @param previousResult
   * @param action
   *
   * @returns {*} Updated cache result.
   */
  reduceItem(context, matcher, previousResult, action) {
    let result = previousResult;

    let updatedItem = this.getMutatedItem(action);
    if (updatedItem) {
      let queryName = this._query.definitions[0].name.value;
      logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

      let transform = this.getTransform(context, matcher, previousResult, updatedItem);
      if (transform) {
        result = this.doTransform(previousResult, transform);
      }
    }

    return result;
  }

  /**
   * Get the custom item transformation.
   *
   * @param context
   * @param matcher
   * @param previousResult
   * @param updatedItem
   * @returns {*}
   */
  getTransform(context, matcher, previousResult, updatedItem) {
    return this._reducer && this._reducer(context, matcher, previousResult, updatedItem);
  }
}

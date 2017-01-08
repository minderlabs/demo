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

/**
 * { items: $remove: item }
 */
update.extend('$remove', (item, items) => {
  return _.filter(items, i => i.id !== item.id);
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

// TODO(burdon): Holy grail would be to introspect the query and do this automatically (DESIGN DOC).

// TODO(burdon): Multiple queries bound with different (filter) values.
// Remove stopped queries from store and internal tracking.
// https://github.com/minderlabs/demo/pull/52
// https://github.com/apollostack/apollo-client/issues/903
// https://github.com/apollostack/apollo-client/pull/1054 [partially resolved]
// http://dev.apollodata.com/react/cache-updates.html#resultReducers

/**
 * Base class for reducers.
 *
 * The reducer updates the cache after a mutation occurs (both optimistic results and results from the server).
 */
class Reducer {

  /**
   * Creates a reducer function that returns a list with the updated item either
   * appended or removed from the list based on the filter.
   *
   * @param matcher
   * @param context
   * @param filter
   * @param updatedItem
   * @returns {function([Item])}
   */
  // TODO(burdon): Use push/remove instead?
  // TODO(burdon): Factor out with ListReducer class below.
  static listApplicator(matcher, context, filter, updatedItem) {
    return (items) => {
      let taskIdx = _.findIndex(items, item => item.id == updatedItem.id);
      if (taskIdx == -1) {
        // Append.
        return [...items, updatedItem];
      } else {
        return _.compact(_.map(items, item => {
          if (item.id == updatedItem.id) {
            // Remove if doesn't match filter.
            if (matcher.matchItem(context, {}, filter, updatedItem)) {
              return updatedItem;
            }
          } else {
            // Keep others.
            return item;
          }
        }));
      }
    };
  }

  /**
   * @param spec Object of the form below.
   * @param customReducer Custom reducer function.
   *
   * TODO(burdon): Document (see project.js for complete example).
   *
   * {
   *   mutation {
   *     type: MutationType,
   *     path: "mutation_action_data_path"      // Path to mutation root result.
   *   },
   *   query: {
   *     type: QueryType
   *     path: "query_result_path"              // Path to query root result.
   *   }
   * }
   */
  constructor(spec, customReducer) {
    console.assert(spec, customReducer);

    this._spec = spec;

    // TODO(burdon): Extend or inject?
    this._customReducer = customReducer;

    // TODO(burdon): Check when created and called. And when instantiated.
    let queryName = this.query.definitions[0].name.value;
    console.log('###### REDUCER [%s] ######', queryName);
  }

  get mutation() {
    return this._spec.mutation.type;
  }

  get query() {
    return this._spec.query.type;
  }

  getResult(data) {
    return _.get(data, this._spec.query.path);
  }

  /**
   * Returns the mutated item (or null).
   * @param action
   * @returns {Item}
   */
  getMutatedItem(action) {
    let mutationName = this.mutation.definitions[0].name.value;
    if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === mutationName) {
      // TODO(burdon): Must match mutation (make customizable).
      return _.get(action.result.data, this._spec.mutation.path);
    }
  }

  doTransform(previousResult, transform) {
    console.assert(previousResult && transform);
    logger.log($$('Transform: %o: %s', previousResult, JSON.stringify(transform, 0, 2)));
    return update(previousResult, transform);
  }
}

/**
 * the List Reducer updates the currently cached list items based on the mutation.
 */
export class ListReducer extends Reducer {

  constructor(spec, customReducer=null) {
    super(spec, customReducer);
  }

  getItems(data) {
    return this.getResult(data);
  }

  /**
   * Execute the reducer.
   *
   * @param matcher
   * @param context
   * @param filter
   * @param previousResult
   * @param action
   *
   * @returns {*} Updated cache result.
   */
  reduceItems(matcher, context, filter, previousResult, action) {
    let result = previousResult;

    let updatedItem = this.getMutatedItem(action);
    if (updatedItem) {
      let queryName = this.query.definitions[0].name.value;
      logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

      let transform = this.getTransform(matcher, context, filter, previousResult, updatedItem);
      if (transform) {
        result = this.doTransform(previousResult, transform);
      }
    }

    return result;
  }

  /**
   * Get the default list transformation.
   *
   * @param matcher
   * @param context
   * @param filter
   * @param previousResult
   * @param updatedItem
   * @returns {object} Transform function.
   */
  getTransform(matcher, context, filter, previousResult, updatedItem) {

    // Custom reducers are required when the list is not at the root of the result.
    if (this._customReducer) {
      return this._customReducer(matcher, context, filter, previousResult, updatedItem);
    }

    // TODO(burdon): Is the root item needed?
    // Determine if the mutated item matches the filter.
    let match = matcher.matchItem(context, {}, filter, updatedItem);

    // Determine if the item matches and is new, otherwise remove it.
    // NOTE: do nothing if it's just an update.
    let path = this._spec.query.path;
    let items = _.get(previousResult, path);
    let insert = match && _.findIndex(items, item => item.id === updatedItem.id) === -1;
    if (insert) {
      // TODO(burdon): Preserve sort order (if set, otherwise top/bottom of list).
      return { [path]: { $push: [ updatedItem ] } };
    } else if (!match) {
      return { [path]: { $remove: updatedItem } };
    }
  }
}

/**
 * The item Reducer updates the cached item (which may have a complex shape).
 *
 * The Reducer is called on mutation. When the generic UpdateItemMutation response is received we need
 * to tell Apollo how to stitch the result into the cached response. For item mutations, this is easy
 * since the ID is used to change the existing item. For adds and deletes, Apollo has no way of knowing
 * where the item should fit (e.g., for a flat list it depends on the sort order; for complex query shapes
 * (like Group) it could be on one (or more) of the branches (e.g., Second member's tasks).
 */
export class ItemReducer extends Reducer {

  constructor(spec, customReducer=null) {
    super(spec, customReducer);
  }

  getItem(data) {
    return this.getResult(data);
  }

  /**
   * Execute the reducer.
   * TODO(burdon): Doc.
   *
   * @param matcher
   * @param context
   * @param previousResult
   * @param action
   *
   * @returns {*} Updated cache result.
   */
  reduceItem(matcher, context, previousResult, action) {
    let result = previousResult;

    let updatedItem = this.getMutatedItem(action);
    if (updatedItem) {
      let queryName = this.query.definitions[0].name.value;
      logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

      let transform = this.getTransform(matcher, context, previousResult, updatedItem);
      if (transform) {
        result = this.doTransform(previousResult, transform);
      }
    }

    return result;
  }

  /**
   * Get the custom item transformation.
   * TODO(burdon): Doc.
   *
   * @param matcher
   * @param context
   * @param previousResult
   * @param updatedItem
   * @returns {*}
   */
  getTransform(matcher, context, previousResult, updatedItem) {
    return this._customReducer && this._customReducer(matcher, context, previousResult, updatedItem);
  }
}

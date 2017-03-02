//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import { graphql } from 'react-apollo';
import update from 'immutability-helper';

import $$ from '../util/format';
import Logger from '../util/logger';

import { ID } from './id';
import { UpsertItemsMutation } from './mutations';

const logger = Logger.get('reducer');

//
// Mutation defs.
//

const UpsertItemsMutationName = _.get(UpsertItemsMutation, 'definitions[0].name.value');
const UpsertItemsMutationPath = _.get(UpsertItemsMutation, 'definitions[0].selectionSet.selections[0].name.value');

//
// Custom helper commands.
// https://github.com/kolodny/immutability-helper (Replaces below)
// https://facebook.github.io/react/docs/update.html#available-commands
//

/**
 * { items: $remove: item }
 * @returns new array.
 */
update.extend('$remove', (item, items) => {
  return _.filter(items, i => i.id !== item.id);
});

/**
 * { items: $replace: { id, item } }
 * @returns new array.
 */
update.extend('$replace', (spec, items) => {
  let { id, item } = spec;
  return _.map(items, i => { return i.id === id ? item : i });
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

  // TODO(burdon): This depends specifically on UpsertItemsMutation.

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
   * @param query GQL Query Type.
   * @param reducer Custom reducer.
   */
  // TODO(burdon): Extend via inheritance.
  constructor(query, reducer) {
    console.assert(query);
    this._query = query;
    this._reducer = reducer;

    // NOTE: Limited to single return root.
    this._path = _.get(query, 'definitions[0].selectionSet.selections[0].name.value');
  }

  get query() {
    return this._query;
  }

  getResult(data) {
    if (data.error) {
      // TODO(burdon): Apollo bug: shows "Error: Network error:"
      // TODO(burdon): Throw (triggle error handler StatusBar).
      console.error(data.error);
    } else {
      return _.get(data, this._path);
    }
  }

  /**
   * Returns the mutated item (or null).
   * @param action
   * @returns {Item}
   */
  getMutatedItem(action) {
    // TODO(burdon): Const.
    if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === UpsertItemsMutationName) {
      return _.get(action.result.data, UpsertItemsMutationPath);
    }
  }

  doTransform(previousResult, transform) {
    console.assert(previousResult && transform);
//  logger.log($$('Transform: %o\n%s', previousResult, JSON.stringify(transform, 0, 2)));
    return update(previousResult, transform);
  }
}

/**
 * the List Reducer updates the currently cached list items based on the mutation.
 */
export class ListReducer extends Reducer {

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
    console.assert(matcher && context && filter && previousResult && action);
    let result = previousResult;
    if (action.type !== 'APOLLO_MUTATION_RESULT') {
      return result;
    }

    try {
      // TODO(burdon): Handle multiple.
      let updatedItem = this.getMutatedItem(action)[0];
      if (updatedItem) {
        let queryName = this.query.definitions[0].name.value;
        logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

        let transform = this.getTransform(matcher, context, filter, previousResult, updatedItem);
        if (transform) {
          result = this.doTransform(previousResult, transform);
        }
      }
    } catch(error) {
      console.error('Reducer failed:', error);
    }

    return result;
  }

  /**
   * Get the default list transformation.
   * https://github.com/kolodny/immutability-helper
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
    let reducer = this._reducer;
    if (reducer) {
      return reducer(matcher, context, filter, previousResult, updatedItem);
    }

    // Path to items in result.
    let path = this._path;
    let items = _.get(previousResult, path);

    // Replace the item if it is a recent update to an external item.
    let exists = _.findIndex(items, item => item.id === updatedItem.id) !== -1;
    if (!exists && updatedItem.fkey) {
      return {
        [path]: {
          $replace: {
            id: _.find(items, item => item.namespace && ID.getForeignKey(item) === updatedItem.fkey).id,
            item: updatedItem
          }
        }
      };
    }

    // Remove the item if it doesn't match the current query.
    // TODO(burdon): Is the root item needed? Remove this from matcher?
    let match = matcher.matchItem(context, {}, filter, updatedItem);
    if (!match) {
      return {
        [path]: {
          $remove: updatedItem
        }
      };
    }

    // Insert the item if it doesn't already exist (but matches).
    if (!exists) {
      // TODO(burdon): Preserve sort order (if set, otherwise top/bottom of list).
      return {
        [path]: {
          $push: [ updatedItem ]
        }
      };
    }

    // Do nothing if it's just an update.
  }
}

/**
 * The item Reducer updates the cached item (which may have a complex shape).
 *
 * The Reducer is called on mutation. When the generic UpsertItemsMutation response is received we need
 * to tell Apollo how to stitch the result into the cached response. For item mutations, this is easy
 * since the ID is used to change the existing item. For adds and deletes, Apollo has no way of knowing
 * where the item should fit (e.g., for a flat list it depends on the sort order; for complex query shapes
 * (like Group) it could be on one (or more) of the branches (e.g., Second member's tasks).
 */
export class ItemReducer extends Reducer {

  /**
   * @param query
   * @param customReducer
   * @return standard mutation wrapper supplied to redux's combine() method.
   */
  static graphql(query, customReducer=undefined) {
    let reducer = new ItemReducer(query, customReducer);

    return graphql(query, {

      // Map properties to query.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let { matcher, context, itemId } = props;

        return {
          variables: {
            itemId
          },

          reducer: (previousResult, action) => {
            return reducer.reduceItem(matcher, context, previousResult, action);
          }
        };
      },

      // Map query result to component properties.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let { loading, error, refetch } = data;
        let item = reducer.getItem(data);

        return {
          loading,
          error,
          refetch,
          item
        }
      }
    })
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
    console.assert(matcher && context && previousResult && action);
    let result = previousResult;
    if (action.type !== 'APOLLO_MUTATION_RESULT') {
      return result;
    }

    try {
      // TODO(burdon): Handle multiple.
      let updatedItem = this.getMutatedItem(action)[0];
      if (updatedItem) {
        let queryName = this.query.definitions[0].name.value;
        logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

        let transform = this.getTransform(matcher, context, previousResult, updatedItem);
        if (transform) {
          result = this.doTransform(previousResult, transform);
        }
      }
    } catch(error) {
      console.error('Reducer failed:', error);
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
    let reducer = this._reducer;
    return reducer && reducer(matcher, context, previousResult, updatedItem);
  }
}

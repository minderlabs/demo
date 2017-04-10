//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import { graphql } from 'react-apollo';
import update from 'immutability-helper';

import $$ from '../util/format';
import Logger from '../util/logger';

import { ID } from './id';
import { MutationUtil } from './mutations';
import { ItemUtil } from './item_util';

const logger = Logger.get('reducer');

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

/**
 * Merge spec.item into the item in items with matching id.
 * { items: $deepMerge: { id, item } }
 * @returns new array.
 */
update.extend('$deepMerge', (spec, items) => {
  let { id, item, clearFields=[], omitFields=[] } = spec;

  return _.map(items, i => {
    if (i.id === id) {
      ItemUtil.clearFields(i, clearFields);
      return ItemUtil.mergeItems(i, item, omitFields);
    } else {
      return i;
    }
  });
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

  // TODO(burdon): Combine into single reducer.

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
  // TODO(burdon): Make available to customer reducers (e.g., project, task).
  static listApplicator(matcher, context, filter, updatedItem) {
    return (items) => {
      // TODO(burdon): Make sure matches.
      let taskIdx = _.findIndex(items, item => item.id === updatedItem.id);
      if (taskIdx === -1) {
        // Append.
        return [...items, updatedItem];
      } else {
        // TODO(burdon): Use push/remove instead?
        return _.compact(_.map(items, item => {
          if (item.id === updatedItem.id) {
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
   * @param {string} path Relative path.
   * @param reducer Custom reducer.
   */
  // TODO(burdon): Extend via inheritance.
  constructor(query, reducer=undefined, path=undefined) {
    console.assert(query);
    this._query = query;
    this._reducer = reducer;

    // NOTE: Limited to single return root (for lists, this is typically the "items" root).
    this._rootPath =
      _.get(query, 'definitions[0].selectionSet.selections[0].alias.value',
        _.get(query, 'definitions[0].selectionSet.selections[0].name.value'));

    this._path = path ? (this._rootPath + '.' + path) : this._rootPath;
  }

  get query() {
    return this._query;
  }

  getResult(data, defValue) {
    if (data.error) {
      // TODO(burdon): Apollo bug: shows "Error: Network error:"
      // TODO(burdon): Throw (trigger error handler StatusBar).
      console.error(data.error);
    } else {
      return _.get(data, this._path, defValue);
    }
  }

  /**
   * Returns the mutated item (or null).
   * @param action
   * @returns {Item}
   */
  getMutatedItem(action) {
    return MutationUtil.getUpsertItemsMutationResult(action);
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

  // TODO(burdon): Rather than pass in custom reduer, extend this class and unify Item/List reducers.

  /**
   * Creates HOC for list query.
   *
   * @param query
   * @param path Path relative to response of items.
   * @return standard mutation wrapper supplied to redux's combine() method.
   */
  static graphql(query, path='items') {
    let listReducer = new ListReducer(query, null, path);

    // Return HOC.
    return graphql(query, {
      withRef: 'true',

      // Configure query variables.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      // http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.query
      options: (props) => {
        let { context, matcher, filter } = props;

        // TODO(burdon): Generates a new callback each time rendered. Create property for class.
        // https://github.com/apollostack/apollo-client/blob/master/src/ApolloClient.ts
        return {
          variables: {
            filter,
          },

          reducer: (previousResult, action) => {
            return listReducer.reduceItems(matcher, context, filter, previousResult, action);
          }
        }
      },

      // Configure props passed to component.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let { matcher, filter, itemInjector } = ownProps;
        let { errors, loading, refetch } = data;

        // Get query result.
        let items = listReducer.getResult(data, []);
        let groupedItems = _.get(data, listReducer._rootPath + '.groupedItems');

        // Inject additional items (e.g., from context).
        if (itemInjector) {
          items = itemInjector(items);
        }

        return {
          errors,
          loading,
          refetch,
          matcher,

          // Data from query.
          items,
          groupedItems,

          // Paging.
          // TODO(burdon): Hook-up to UX.
          // http://dev.apollodata.com/react/pagination.html
          // http://dev.apollodata.com/react/cache-updates.html#fetchMore
          fetchMoreItems: () => {
            return data.fetchMore({
              variables: {
                filter
              },

              // TODO(burdon): Grouped items.
              updateQuery: (previousResult, { fetchMoreResult }) => {
                return _.assign({}, previousResult, {
                  items: [...previousResult.items, ...fetchMoreResult.data.items]
                });
              }
            });
          }
        }
      }
    });
  }

  /**
   * Execute the reducer.
   *
   * @param matcher determines if items still match the query, if not null.
   * @param context
   * @param filter used to determine if items still match the query.
   * @param previousResult
   * @param action
   *
   * @returns {*} Updated cache result.
   */
  reduceItems(matcher, context, filter, previousResult, action) {
    console.assert(context && previousResult && action);
    let updatedItems = MutationUtil.getUpsertItemsMutationResult(action);
    if (updatedItems) {
      try {
        // TODO(burdon): Handle multiple items.
        let updatedItem = updatedItems[0];
        if (updatedItem) {
          // TODO(burdon): Const.
          let queryName = this.query.definitions[0].name.value;
          logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

          let transform = this.getTransform(matcher, context, filter, previousResult, updatedItem);
          if (transform) {
            previousResult = this.doTransform(previousResult, transform);
          }
        }
      } catch (error) {
        console.error('Reducer failed:', error);
      }
    }

    return previousResult;
  }

  /**
   * Get the default list transformation.
   * https://github.com/kolodny/immutability-helper
   *
   * @param matcher determines if items still match the query, if not null.
   * @param context
   * @param filter used to determine if items still match the query.
   * @param previousResult
   * @param updatedItem
   * @returns {object} Transform function.
   */
  getTransform(matcher, context, filter, previousResult, updatedItem) {
    console.assert(matcher && context && filter && previousResult && updatedItem);

    // Custom reducers are required when the list is not at the root of the result.
    let reducer = this._reducer;
    if (reducer) {
      return reducer(matcher, context, filter, previousResult, updatedItem);
    }

    // Items in current list (previous result).
    let currentItems = _.get(previousResult, this._path);

    // Look for existing item.
    let currentItem = _.find(currentItems, item => item.id === updatedItem.id);

    //
    // Merge the item if it's an update to an external item (e.g., a Document).
    // TODO(burdon): This should apply to Item reducer also.
    //
    if (!currentItem && updatedItem.fkey) {
      let currentExternal =
        _.find(currentItems, item => item.namespace && (ID.getForeignKey(item) === updatedItem.fkey));
      if (currentExternal) {
        return _.set({}, this._path, {
          $deepMerge: {
            id: currentExternal.id,
            item: updatedItem,
            clearFields: ['namespace']
          }
        });
      }
    }

    //
    // Remove the item if it doesn't match the current query.
    // TODO(burdon): Is the root item needed? Remove this from matcher?
    //
    let match = matcher.matchItem(context, {}, filter, updatedItem);
    if (!match) {
      return _.set({}, this._path, {
        $remove: updatedItem
      });
    }

    //
    // Insert the item if it doesn't already exist (but matches).
    //
    if (!currentItem) {
      // TODO(burdon): Preserve sort order (if set, otherwise top/bottom of list).
      return _.set({}, this._path, {
        $push: [ updatedItem ]
      });
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
   * Creates HOC for item query.
   *
   * @param query
   * @param customReducer
   *
   * Example:
   * Reducer = (matcher, context, previousResult, updatedItem) => {
   *   if (updatedItem.type === 'Task') {
   *     return {
   *       items:  $push: [ updatedItem ]
   *     }
   *   }
   * }
   *
   * @return standard mutation wrapper supplied to redux's combine() method.
   */
  static graphql(query, customReducer=undefined) {
    let itemReducer = new ItemReducer(query, customReducer);

    // Return HOC.
    return graphql(query, {
      withRef: 'true',

      // Map properties to query.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let { config, matcher, context, itemId } = props;

        // Options enable disabling of reducer for debugging.
        let reducer;
        if (_.get(config, 'options.reducer')) {
          reducer = (previousResult, action) => {
            return itemReducer.reduceItem(matcher, context, previousResult, action);
          };
        }

        return {
          variables: {
            itemId
          },

          reducer
        };
      },

      // Map query result to component properties.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let { errors, loading, refetch } = data;
        let item = itemReducer.getResult(data);

        return {
          errors,
          loading,
          refetch,
          item
        }
      }
    })
  }

  /**
   * Execute the reducer.
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

    let updatedItems = MutationUtil.getUpsertItemsMutationResult(action);
    if (updatedItems) {
      try {
        // TODO(burdon): Handle multiple items.
        let updatedItem = updatedItems[0];
        if (updatedItem) {
          let queryName = this.query.definitions[0].name.value;
          logger.log($$('Reducer[%s:%s]: %o', queryName, action.operationName, updatedItem));

          let transform = this.getTransform(matcher, context, previousResult, updatedItem);
          if (transform) {
            previousResult = this.doTransform(previousResult, transform);
          }
        }
      } catch (error) {
        console.error('Reducer failed:', error);
      }
    }

    return previousResult;
  }

  /**
   * Get the custom item transformation.
   *
   * @param matcher
   * @param context
   * @param previousResult
   * @param updatedItem
   * @returns {*}
   */
  getTransform(matcher, context, previousResult, updatedItem) {
    console.assert(matcher && context && previousResult && updatedItem);

    let reducer = this._reducer;
    return reducer && reducer(matcher, context, previousResult, updatedItem);
  }
}

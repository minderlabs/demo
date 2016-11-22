//
// Copyright 2016 Minder Labs.
//

'use strict';

import { graphql } from 'react-apollo';
import update from 'immutability-helper';

import { ID, IdGenerator } from './id';

// TODO(burdon): Unit tests.
// TODO(burdon): Depends on Apollo Client (move out of core)?

/**
 * Helper for reducer functions.
 * The reducers updates the cached state of a query after a mutation occurs.
 * Since our framework utilizes a common mutation (UpdateItemMutation) we can generalize updates to the cache.
 */
export class Reducer {

  /**
   * Updates the cache for an item mutation for the given filter.
   *
   * @param matcher
   * @param mutation
   * @param query
   * @param filter
   * @param path
   *
   * @returns {function(*, *)}
   */
  static reduce(matcher, mutation, query, filter, path=null) {
    console.assert(matcher && mutation && query && filter);

    let mutationName = mutation.definitions[0].name.value;
    let queryName = query.definitions[0].name.value;

    // TODO(burdon): Caller can specialize shape of result set (e.g., group).
    //  I.e., locate where the items set is in the result.

    // TODO(burdon): Resolve:
    // https://github.com/apollostack/apollo-client/issues/903
    // http://dev.apollodata.com/react/cache-updates.html#resultReducers

    return (previousResult, action) => {
      let result = previousResult;

      if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === mutationName) {
        let updatedItem = action.result.data.updateItem;
        console.assert(updatedItem);
        console.log('Reducer[%s:%s]: %s', queryName, action.operationName, JSON.stringify(updatedItem));

        // Determine if currently matches filter.
        let match = matcher.match(filter, updatedItem);

        // If no match, is this new? (otherwise must be removed).
        let insert = match && _.findIndex(previousResult.items, item => item.id === updatedItem.id) === -1;

        // TODO(burdon): Use path.
        // https://github.com/kolodny/immutability-helper
        // https://facebook.github.io/react/docs/update.html#available-commands
        update.extend('$remove', (item, items) => _.filter(items, item => item.id !== updatedItem.id));

        let op = null;
        if (insert) {
          // Append item.
          // TODO(burdon): Preserve sort order (if set, otherwise top/bottom of list).
          console.log('APPEND: %s', updatedItem.id);
          op = { $push: [updatedItem] };
        } else if (!match) {
          // Remove item from list.
          console.log('REMOVE: %s', updatedItem.id);
          op = { $remove: updatedItem };
        }

        if (op) {
          let transform = path ? path(previousResult, updatedItem, op) : { items: op };
          if (transform) {
            console.log('Transform', transform);
            result = update(previousResult, transform);
          }
        }
      }

      // TODO(burdon): Is it possible to trigger refetch if reducer fails?
      return result;
    }
  }
}

/**
 * Helper class that manages item mutations.
 * The Mutator is used directly by components to create and update items.
 */
export class Mutator {

  // TODO(burdon): Static helpers to create object/array mutations (e.g., add delete label).

  /**
   * Returns a standard mutation wrapper supplied to redux's combine() method.
   */
  static graphql(mutation) {
    console.assert(mutation);

    return graphql(mutation, {
      props: ({ ownProps, mutate }) => ({

        // TODO(burdon): Wrap Redux's mapStateToProps to grab injector.

        /**
         * Injects a mutator instance into the wrapped components properties.
         */
        mutator: new Mutator(mutate, ownProps.injector.get(IdGenerator)),
      })
    });
  }

  constructor(mutate, idGenerator) {
    console.assert(mutate && idGenerator);

    this._mutate = mutate;
    this._idGenerator = idGenerator;
  }

  /**
   * Executes a create item mutation.
   *
   * @param type
   * @param mutations
   */
  createItem(type, mutations) {
    this._mutate({
      variables: {
        itemId: ID.toGlobalId(type, this._idGenerator.createId(type)),
        mutations
      }
    });
  }

  /**
   * Executes an update item mutation.
   *
   * @param item
   * @param mutations
   */
  updateItem(item, mutations) {
    this._mutate({
      variables: {
        itemId: ID.toGlobalId(item.type, item.id),
        mutations
      }
    });
  }
}

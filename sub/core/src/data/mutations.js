//
// Copyright 2016 Minder Labs.
//

import { graphql } from 'react-apollo';
import update from 'immutability-helper';

import { ID, IdGenerator } from './id';
import { TypeUtil } from '../util/type';

// TODO(burdon): Unit tests.
// TODO(burdon): Dependency on Apollo Client (move out of core)? (OK to have server depend on this?)


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
// TODO(burdon): Provide context to matcher to resolve "magic" variables.
//  (E.g., assignee == PARENT; see User.tasks resolver).
// TODO(burdon): ISSUE: Are all queries' reducers called for all mutations?
//
// NOTE: If we get this right, things should work offline.


/**
 * Helper for reducer functions.
 * The reducers updates the cached state of a query after a mutation occurs.
 * Since our framework utilizes a common mutation (UpdateItemMutation) we can generalize updates to the cache.
 */
export class Reducer {

  /**
   * Updates the cache for an item mutation for the given filter.
   *
   * @param context         Matcher context.
   * @param matcher
   * @param typeRegistry
   * @param mutation
   * @param query
   * @param filter
   *
   * @returns {function(*, *)}
   */
  static reduce(context, matcher, typeRegistry, mutation, query, filter={}) {
    console.assert(matcher && typeRegistry && mutation && query);

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

        let transform = null;

        //
        // Update item.
        // Check with TypeRegistry to potentially do complex merge (e.g., update task for member of team).
        //

        if (previousResult.item) {
          console.log('Update item: %s', TypeUtil.JSON(previousResult));

          // TODO(burdon): Instead of this should have MutationContext that understands the Query "shape".
          //  E.g., "Task" may be updated in different contexts (Task List, Team page, etc.)
          let path = typeRegistry.path(previousResult.item.type);
          transform = path && path(context, matcher, previousResult, updatedItem);
        }

        //
        // Update list (e.g., favorites).
        //

        if (previousResult.items) {
          console.log('Update items: %s', TypeUtil.JSON(previousResult));

          // TODO(burdon): Context.
          // Determine if currently matches filter.
          let match = matcher.matchItem(context, {}, filter, updatedItem);

          // If no match, is this new? (otherwise must be removed).
          let insert = match && _.findIndex(previousResult.items, item => item.id === updatedItem.id) === -1;

          // NOTE: DO NOTHING IF JUST CHANGE ITEM.
          let op = null;
          if (insert) {
            // Append item.
            // TODO(burdon): Preserve sort order (if set, otherwise top/bottom of list).
            console.log('APPEND: %s', updatedItem.id);
            op = { $push: [updatedItem] };
          } else if (!match) {
            // Remove item from list.
            console.log('REMOVE: %s', updatedItem.id);

            // TODO(burdon): Use path.
            // TODO(burdon): Just use apply?
            // https://github.com/kolodny/immutability-helper
            // https://facebook.github.io/react/docs/update.html#available-commands
            update.extend('$remove', (item, items) => _.filter(items, item => item.id !== updatedItem.id));
            op = { $remove: updatedItem };
          }

          if (op) {
            transform = { items: op };
          }
        }

        if (transform) {
          console.log('Transform: %s', TypeUtil.JSON(previousResult), JSON.stringify(transform, 0, 2));
          result = update(previousResult, transform);
        }
      }

      // TODO(burdon): Is it possible to trigger refetch if reducer fails?
      return result;
    }
  }
}

/**
 * Utils to create mutations.
 */
export class MutationUtil {

  /**
   *
   * @param field
   * @param type
   * @param oldValue
   * @param newValue
   * @returns {{field: *, value: {}}}
   */
  static field(field, type, newValue, oldValue=undefined) {

    // TODO(burdon): If newValue is undefined then remove? Different semantics from "only if set").
    if (!_.isEmpty(newValue) && newValue !== oldValue) {
      return {
        field: field,
        value: {
          [type]: newValue
        }
      };
    }
  }
}

/**
 * Helper class that manages item mutations.
 * The Mutator is used directly by components to create and update items.
 */
export class Mutator {

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

  /**
   *
   * @param mutate
   * @param idGenerator
   */
  // TODO(burdon): Document.
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

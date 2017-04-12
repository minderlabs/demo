//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import { TypeUtil } from '../util/type';
import Logger from '../util/logger';

import { Transforms } from './transforms';
import { ID } from './id';
import { Database } from './database';
import { Fragments } from './fragments';

const logger = Logger.get('mutations');

//
// Generic mutation.
// TODO(burdon): Extend fragments returned.
//

// TODO(madadam): Think more about "thin vs fat" fragments for the generic mutation.
// Since we're using a single generic mutation type, it has to be configured to retrieve
// any data needed by any component, including detailed nested objects (e.g. ContactTaskFragment).
// Unclear if there's a material downside to this, but it feels wrong.

export const UpsertItemsMutation = gql`
  mutation UpsertItemsMutation($mutations: [ItemMutationInput]!) {
    upsertItems(mutations: $mutations) {
      ...ItemFragment
      ...ContactTasksFragment
      ...TaskFragment
      ...ProjectFragment
      ...ProjectBoardFragment
    }
  }
  
  ${Fragments.ItemFragment}
  ${Fragments.ContactTasksFragment}
  ${Fragments.TaskFragment}
  ${Fragments.ProjectFragment}
  ${Fragments.ProjectBoardFragment}
`;

export const UpsertItemsMutationName = // 'UpsertItemsMutation'
  _.get(UpsertItemsMutation, 'definitions[0].name.value');

export const UpsertItemsMutationPath = // 'upsertItems'
  _.get(UpsertItemsMutation, 'definitions[0].selectionSet.selections[0].name.value');

/**
 * Utils to create mutations.
 */
export class MutationUtil {

  /**
   * Get the UpsertItemsMutation from an Apollo Redux action.
   *
   * @param action Redux action.
   * @param optimistic If true then also return optimistic results.
   *
   * NOTE: The optimistic results may not have well-formed items (e.g., linked items may just have string IDs),
   * so in some cases (e.g., Finder's ContextHandler) we may want to skip these partial results.
   *
   * @returns root result object or undefined.
   */
  static getUpsertItemsMutationResult(action, optimistic=true) {
    // Filter for UpsertItemsMutationName mutations.
    if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === UpsertItemsMutationName) {

      // Filter-out optimistic updates if required.
      if (optimistic || !_.get(action, 'result.data.optimistic')) {
        return _.get(action.result.data, UpsertItemsMutationPath);
      }
    }
  }

  /**
   * Create mutations to clone the given item.
   *
   * @param {string} bucket
   * @param {Item} item
   * @return {[Mutation]}
   */
  static cloneItem(bucket, item) {
    console.assert(bucket && item);

    let mutations = [
      MutationUtil.createFieldMutation('bucket', 'string', bucket)
    ];

    // TODO(burdon): Introspect type map.
    mutations.push(MutationUtil.createFieldMutation('title', 'string', item.title));

    if (item.email) {
      mutations.push(MutationUtil.createFieldMutation('email', 'string', item.email));
    }
    if (item.thumbnailUrl) {
      mutations.push(MutationUtil.createFieldMutation('thumbnailUrl', 'string', item.thumbnailUrl));
    }

    return mutations;
  }

  /**
   * Creates a set mutation.
   *
   * @param {string} field
   * @param {string} type
   * @param {string|int} value
   * @param {boolean} add
   */
  static createSetMutation(field, type, value, add=true) {
    console.assert(field && type && value);
    return {
      field,
      value: {
        set: [{
          add,
          value: {
            [type]: value
          }
        }]
      }
    };
  }

  /**
   * Creates a mutation field if the old and new values are different.
   *
   * @param field
   * @param type If null, then set nul value.
   * @param value If null, then set null value.
   * @returns {mutation}
   */
  static createFieldMutation(field, type=null, value=null) {
    console.assert(field);
    return {
      field,
      value: !type || _.isNil(value) ? {
        null: true
      } : {
        [type]: value
      }
    };
  }

  /**
   * Creates a mutation to add or remove a label.
   * @param label
   * @param set
   * @returns {mutation}
   */
  static createLabelMutation(label, set=true) {
    console.assert(label);
    return {
      field: 'labels',
      value: {
        set: [{
          add: set === true,
          value: {
            string: label
          }
        }]
      }
    };
  }

  /**
   * Adds the delete label.
   * @returns {mutation}
   */
  static createDeleteMutation(set=true) {
    return MutationUtil.createLabelMutation('_deleted', set);
  }
}

/*
 * TODO(burdon): id values should include item for optimistic responses.
 *
 * mutator.batch(bucket)
 *   .createItem('Task', [{
 *     field: 'title',
 *     value: {
 *       string: 'Task-1'
 *     }
 *   }], 'new_item')
 *   .updateItem('project-1', [{
 *     field: "tasks",
 *     value: {
 *       set: {
 *         value: {
 *           id: "${new_item}.id"  // Reference named item created above.
 *         }
 *       }
 *     }
 *   }])
 *   .commit();
 */
class Batch {

  /**
   * Batch is used to exec multiple mutations in one transaction.
   * @param mutator
   * @param bucket
   */
  constructor(mutator, bucket) {
    console.assert(mutator && bucket);
    this._mutator = mutator;
    this._bucket = bucket;
    this._operations = [];
  }

  /**
   * Creates new item in batch.
   * @param {string} type
   * @param {[Mutation]} mutations
   * @param {string} name Optional name that can be referenced by subsequent updates below.
   * @return {Batch}
   */
  createItem(type, mutations, name=undefined) {
    console.assert(type && mutations);
    mutations = TypeUtil.flattenArrays(mutations);
    this._operations.push({
      type, mutations, name
    });

    return this;
  }

  /**
   * Updates existing item in batch.
   * @param {Item} item
   * @param {[Mutation]} mutations Mutations can reference created items above via ${name}.
   * @param {string|undefined} name Optional name that can be referenced by subsequent updates below.
   * @param {Query|undefined} query
   * @return {Batch}
   */
  updateItem(item, mutations, name=undefined, query=undefined) {
    console.assert(item && mutations);
    mutations = TypeUtil.flattenArrays(mutations);
    this._operations.push({
      item, mutations, name, query
    });

    return this;
  }

  /**
   * Submits the batch.
   */
  // TODO(burdon): Actually batch mutations. (affects optimistic result and reducer)?
  commit() {
    logger.log('Commit: ' + TypeUtil.stringify(this._operations));

    // Map of named items.
    let itemsById = new Map();
    let itemsByName = new Map();

    // Process create and update mutations.
    _.each(this._operations, operation => {
      let { item, type, mutations, name, query } = operation;
      if (item) {

        //
        // Update item.
        //

        item = this._mutator._updateItem(this._bucket, item, mutations, query, itemsByName, itemsById);
        itemsById.set(item.id, item);
        if (name) {
          itemsByName.set(name, item);
        }
      } else {

        //
        // Create item.
        //

        item = this._mutator._createItem(this._bucket, type, mutations);
        itemsById.set(item.id, item);
        if (name) {
          itemsByName.set(name, item);
        }
      }
    });
  }
}

/**
 * Helper class that manages item mutations.
 * The Mutator is used directly by components to create and update items.
 * NOTE: The mutation is GraphQL Mutation specific (and typically involves specific resolvers).
 */
export class Mutator {

  /**
   * @return Standard mutation wrapper supplied to redux's combine() method.
   */
  static graphql() {
    return graphql(UpsertItemsMutation, {
      withRef: true,

      options: {
        // http://dev.apollodata.com/core/read-and-write.html#updating-the-cache-after-a-mutation
        // http://dev.apollodata.com/react/api-mutations.html#graphql-mutation-options-update
//      update: (proxy, { data }) => {}
      },

      //
      // Injects a mutator instance into the wrapped components' properties.
      // NOTE: dependencies must previously have been injected into the properties.
      //
      props: ({ ownProps, mutate }) => {
        let { config, client, idGenerator, analytics } = ownProps;
        let mutator = new Mutator(config, client, idGenerator, analytics, mutate);
        return {
          mutator
        };
      }
    });
  }

  /**
   * Create the optimistic result.
   *
   * http://dev.apollodata.com/react/mutations.html#optimistic-ui
   * http://dev.apollodata.com/react/optimistic-ui.html#optimistic-basics
   * http://dev.apollodata.com/react/cache-updates.html
   *
   * @param {[Item]} items
   */
  static optimisticResponse(items) {
    return {
      // Add hint for reducer.
      optimistic: true,

      // Root.
      [UpsertItemsMutationPath]: items
    };
  }

  /**
   * @param config
   * @param client Apollo client.
   * @param idGenerator
   * @param analytics
   * @param mutate Function provided by apollo.
   */
  constructor(config, client, idGenerator, analytics, mutate) {
    console.assert(config, client, idGenerator && analytics && mutate);
    this._config = config;
    this._client = client;
    this._idGenerator = idGenerator;
    this._analytics = analytics;
    this._mutate = mutate;
  }

  batch(bucket) {
    console.assert(bucket, 'Invalid bucket.');
    return new Batch(this, bucket);
  }

  /**
   * Executes a create item mutation.
   *
   * @param {string} bucket
   * @param {string} type
   * @param {[{Mutations}]} mutations
   * @return {Item} Optimistic result.
   */
  _createItem(bucket, type, mutations) {
    mutations = _.compact(_.concat(mutations));

    // Set bucket.
    mutations.push(MutationUtil.createFieldMutation('bucket', 'string', bucket));

    let itemId = this._idGenerator.createId();

    let item = Transforms.applyObjectMutations({
      __typename: type,
      type,
      id: itemId
    }, mutations);

    // Create optimistic result.
    let optimisticResponse;
    if (_.get(this._config, 'options.optimistic')) {
      optimisticResponse = Mutator.optimisticResponse([item]);
    }

    // TODO(burdon): Look-up references (e.g., assignee).
    // TODO(burdon): Pass query result to bacth for optimistic result.
    // TODO(burdon): How to swap IDs (some values -- e.g., bucket -- are actual strings not references to objects!)
    // TODO(burdon): Get type definitions?

    //
    // Submit mutation.
    //

    // TODO(burdon): READ THIS: Update cache.
    // http://dev.apollodata.com/react/api-mutations.html#graphql-mutation-options-update
    // http://dev.apollodata.com/react/cache-updates.html

    this._analytics && this._analytics.track('item.create', { label: type });

    logger.log('createItem: ' + TypeUtil.stringify({ bucket, item: { type, id: itemId }, mutations }));
    this._mutate({
      variables: {
        mutations: [
          {
            bucket,
            itemId: ID.toGlobalId(type, itemId),
            mutations
          }
        ]
      },

      optimisticResponse
    });

    return item;
  }

  /**
   * Executes an update item mutation.
   *
   * @param {string} bucket
   * @param {Item} item
   * @param {[{Mutations}]} mutations
   * @param {Query|undefined} query Item query.
   * @param {Map} itemsByName
   * @param {Map} itemsById
   * @return {Item} Optimistic result (NOTE: this will change if the item is being copied).
   */
  _updateItem(bucket, item, mutations, query=undefined, itemsByName=undefined, itemsById=undefined) {
    mutations = _.compact(_.concat(mutations));

    //
    // Special handling for non-USER namespace.
    // TODO(burdon): Unit test.
    // TODO(burdon): Fall through to standard update processing below (NOT CREATE)?
    //

    if (item.namespace) {
      switch (item.namespace) {
        case Database.NAMESPACE.LOCAL: {

          //
          // Clone local item on mutation.
          //

          let cloneMutations = _.concat(
            // Mutations to clone the item's properties.
            // TODO(burdon): Remove mutations for current properties below.
            MutationUtil.cloneItem(bucket, item),

            // Current mutations.
            mutations
          );

          // TODO(burdon): Add fkey (e.g., email)?
          let clonedItem = this._createItem(bucket, item.type, cloneMutations);
          logger.log('Cloned local item: ' + JSON.stringify(clonedItem));
          return clonedItem;
        }

        default: {
          //
          // Clone external item on mutation.
          // NOTE: This assumes that external items are never presented to the client when a USER item
          // exists; i.e., external/USER items are merged on the server (Database.search).
          //

          let cloneMutations = _.concat(
            // Reference the external item.
            MutationUtil.createFieldMutation('fkey', 'string', ID.getForeignKey(item)),

            // Mutations to clone the item's properties.
            // TODO(burdon): Remove mutations for current properties below.
            MutationUtil.cloneItem(bucket, item),

            // Current mutations.
            mutations
          );

          let clonedItem = this._createItem(bucket, item.type, cloneMutations);
          logger.log('Cloned external item: ' + JSON.stringify(clonedItem));
          return clonedItem;
        }
      }
    }

    //
    // Regular mutation of User item.
    //

    // Update references to recently created items.
    _.each(mutations, mutation => {
      TypeUtil.traverse(mutation, (value) => {
        let id = _.get(value, 'value.id');
        if (id) {
          let match = id.match(/\$\{(.+)\}/);
          if (match) {
            // TODO(burdon): Check type.
            let created = itemsByName.get(match[1]);
            console.assert(created && created.id);
            _.set(value, 'value.id', created.id);
          }
        }
      });
    });

    let optimisticResponse;
    if (_.get(this._config, 'options.optimistic')) {

      // TODO(burdon): Instead of passing item into update, pass the Query.
      // Get item from cache (item passed to mutator may be stale).
      // http://dev.apollodata.com/core/read-and-write.html#readquery
      if (query) {
        let data = this._client.readQuery({
          query,
          variables: {
            itemId: ID.toGlobalId(item.type, item.id)
          }
        });

        item = data.item;
      }

      // Create optimistic result.
      item = Transforms.applyObjectMutations(TypeUtil.clone(item), mutations);

      // TODO(burdon): Use mutations above.
      // Patch ID references with actual items.
      if (itemsById) {
        TypeUtil.traverse(item, (value, key, root) => {
          if (_.isString(value)) {
            let match = itemsById.get(value);
            if (match) {
              _.set(root, key, match);
            }
          }
        });
      }

      optimisticResponse = Mutator.optimisticResponse([item]);
    }

    //
    // Submit mutation.
    //

    this._analytics && this._analytics.track('item.update', { label: item.type });

    // TODO(burdon): labels: {"type":"json","json":["_default"]} ??? for Project; DUMP SERVER ITEMS.

    this._mutate({
      variables: {
        mutations: [
          {
            bucket,
            itemId: ID.toGlobalId(item.type, item.id),
            mutations
          }
        ]
      },

      optimisticResponse
    });

    return item;
  }
}

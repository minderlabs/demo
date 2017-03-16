//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import { TypeUtil } from '../util/type';

import { Transforms } from './transforms';
import { ID } from './id';
import { Database } from './database';
import { Fragments } from './fragments';

//
// Generic mutation.
// TODO(burdon): Extend fragments returned.
//

export const UpsertItemsMutation = gql`
  mutation UpsertItemsMutation($mutations: [ItemMutationInput]!) {
    upsertItems(mutations: $mutations) {
      ...ItemFragment
      ...ContactFragment
      ...TaskFragment
      ...ProjectFragment
      ...ProjectBoardFragment
    }
  }
  
  ${Fragments.ItemFragment}
  ${Fragments.ContactFragment}
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
   * NOTE: The optimistic results may not have well-formed items (e.g., linked items may just have string IDs),
   * so in some cases (e.g., Finder's ContextHandler) we may want to skip these partial results.
   *
   * @returns root result object or undefined.
   */
  static getUpsertItemsMutationResult(action, optimistic=true) {
    if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === UpsertItemsMutationName) {
      if (optimistic || !_.get(action, 'result.data.optimistic')) {
        return _.get(action.result.data, UpsertItemsMutationPath);
      }
    }
  }

  /**
   * Create mutations to clone the given item.
   *
   * @param {Item} item
   * @return {[Mutation]}
   */
  static cloneItem(item) {
    console.assert(item && item.title);

    let mutations = [
      MutationUtil.createFieldMutation('title', 'string', item.title)
    ];

    // TODO(burdon): Introspect type map?
    if (item.email) {
      mutations.push(MutationUtil.createFieldMutation('email', 'string', item.email));
    }

    return mutations;
  }

  /**
   * Creates a set mutation.
   *
   * @param field
   * @param type
   * @param value
   */
  static createSetMutation(field, type, value) {
    console.assert(field && type && value);
    return {
      field,
      value: {
        set: [{
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
          add: set == true,
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
  mutator.batch()
    .createItem('Task', [{
      field: 'title',
      value: {
        string: 'Task-1'
      }
    }], 'new_item')
    .updateItem('project-1', [{
      field: "tasks",
      value: {
        set: {
          value: {
            id: "${new_item}.id"  // Reference item created above.
          }
        }
      }
    }])
    .commit();
*/
class Batch {

  /**
   * Batch is used to exec multiple mutations in one transaction.
   * @param mutator
   * @param namespace If defined, overrides the default namespace.
   */
  constructor(mutator, namespace=undefined) {
    console.assert(mutator);
    this._mutator = mutator;
    this._namespace = namespace;
    this._operations = [];
  }

  /**
   * Creates new item in batch.
   * @param type
   * @param mutations
   * @param name Optional name that can be referenced by subsequent updates below.
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
   * @param item
   * @param mutations Mutations can reference created items above via ${name}.
   * @return {Batch}
   */
  updateItem(item, mutations) {
    console.assert(item && mutations);
    mutations = TypeUtil.flattenArrays(mutations);
    this._operations.push({
      item,
      mutations
    });

    return this;
  }

  /**
   * Submits the batch.
   */
  // TODO(burdon): Actually batch mutations. (affects optimistic result and reducer)?
  commit() {

    // Map of named items.
    let itemsById = new Map();
    let itemsByName = new Map();

    // Process create and update mutations.
    _.each(this._operations, operation => {
      let { type, item, mutations, name } = operation;
      if (type) {
        //
        // Create item.
        //

        item = this._mutator.createItem(type, mutations, this._namespace);
        itemsById.set(item.id, item);

        if (name) {
          itemsByName.set(name, item);
        }
      } else {
        //
        // Update item.
        //

        // Update references.
        TypeUtil.traverse(mutations, (value, key) => {
          let id = _.get(value, 'value.id');
          if (id) {
            let match = id.match(/\$\{(.+)\}/);
            if (match) {
              let created = itemsByName.get(match[1]);
              _.set(value, 'value.id', created.id);
            }
          }
        });

        // Update item.
        this._mutator.updateItem(item, mutations, this._namespace, itemsById);
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

      //
      // Injects a mutator instance into the wrapped components' properties.
      // NOTE: idGenerator must previously have been injected into the properties.
      //
      props: ({ ownProps, mutate }) => {
        let mutator = new Mutator(ownProps.idGenerator, mutate);
        return {
          mutator
        };
      }
    });
  }

  /**
   * @param idGenerator
   * @param mutate Function provided by apollo.
   */
  constructor(idGenerator, mutate) {
    console.assert(idGenerator && mutate);
    this._idGenerator = idGenerator;
    this._mutate = mutate;
  }

  batch() {
    return new Batch(this);
  }

  // TODO(burdon): Remove non-batch operations.

  /**
   * Executes a create item mutation.
   *
   * @param {string} type
   * @param mutations
   * @param namespace
   * @return {Item} Optimistic result.
   */
  createItem(type, mutations, namespace=undefined) {
    mutations = _.compact(_.concat(mutations));

    // Create optimistic result.
    let itemId = this._idGenerator.createId();
    let item = Transforms.applyObjectMutations({
      __typename: type,
      type,
      id: itemId
    }, mutations);

    // TODO(burdon): Look-up references (e.g., assignee).
    // TODO(burdon): Pass query result to bacth for optimistic result.
    // TODO(burdon): How to swap IDs (some values -- e.g., bucket -- are actual strings not references to objects!)
    // TODO(burdon): Get type definitions?

    //
    // Submit mutation.
    //

    this._mutate({
      variables: {
        namespace,
        mutations: [
          {
            itemId: ID.toGlobalId(type, itemId),
            mutations
          }
        ]
      },

      // http://dev.apollodata.com/react/mutations.html#optimistic-ui
      optimisticResponse: {
        optimistic: true,
        upsertItems: [
          item
        ]
      }
    });

    return item;
  }

  /**
   * Executes an update item mutation.
   *
   * @param {Item} item
   * @param mutations
   * @param namespace
   * @param [itemMap] Optional map of cached items.
   * @return {Item} Optimisitc result (NOTE: this will change if the item is being copied).
   */
  updateItem(item, mutations, namespace, itemMap=undefined) {
    mutations = _.compact(_.concat(mutations));

    //
    // Special handling for non-USER namespace.
    // TODO(burdon): Fall through to standard update processing below (NOT CREATE)?
    //

    if (item.namespace) {
      if (item.namespace === Database.NAMESPACE.LOCAL) {

        //
        // Clone local item on mutation.
        //

        let cloneMutations = _.concat(

          // TODO(burdon): Add email as fkey.

          // Mutations to clone the item's properties.
          // TODO(burdon): Remove mutations for current properties below.
          MutationUtil.cloneItem(item),

          // Current mutations.
          mutations
        );

        console.log('Cloning local item: ' + JSON.stringify(item));
        let clonedItem = this.createItem(item.type, cloneMutations);
        item.fkey = clonedItem.id;
        return clonedItem;
      } else {

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
          MutationUtil.cloneItem(item),

          // Current mutations.
          mutations
        );

        console.log('Cloning external item: ' + JSON.stringify(item));
        return this.createItem(item.type, cloneMutations);
      }
    }

    //
    // Regular mutation of USER item.
    //

    // Create optimistic result.
    Transforms.applyObjectMutations(item, mutations);

    // Check for ID references to recently created items.
    // TODO(burdon): Add item property to value.id (set by mutation creator).
    if (itemMap) {
      TypeUtil.traverse(item, (value, key, root) => {
        if (_.isString(value)) {
          let match = itemMap.get(value);
          if (match) {
            _.set(root, key, match);
          }
        }
      });
    }

    //
    // Submit mutation.
    //

    this._mutate({
      variables: {
        namespace,
        mutations: [
          {
            itemId: ID.toGlobalId(item.type, item.id),
            mutations
          }
        ]
      },

      // http://dev.apollodata.com/react/mutations.html#optimistic-ui
      optimisticResponse: {
        optimistic: true,
        upsertItems: [
          item
        ]
      }
    });

    return item;
  }
}

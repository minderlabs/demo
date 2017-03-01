//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import { TypeUtil } from '../util/type';
import { Transforms } from './transforms';

import { ID } from './id';
import { ItemFragment, TaskFragment, ProjectFragment, ProjectBoardFragment } from './fragments';

//
// Generic mutation.
// TODO(burdon): Extend fragments returned.
//

export const UpsertItemsMutation = gql`
  mutation UpsertItemsMutation($mutations: [ItemMutationInput]!) {
    upsertItems(mutations: $mutations) {
      ...ItemFragment
      ...TaskFragment
      ...ProjectFragment
      ...ProjectBoardFragment
    }
  }
  
  ${ItemFragment}
  ${TaskFragment}
  ${ProjectFragment}
  ${ProjectBoardFragment}
`;

/**
 * Utils to create mutations.
 */
export class MutationUtil {

  /**
   * Create mutations to clone the given item.
   *
   * @param {Item} item
   * @return {[Mutation]}
   */
  static cloneExternalItem(item) {
    // TODO(burdon): Introspect type map?
    return [
      MutationUtil.createFieldMutation('fkey', 'string', ID.getForeignKey(item)),
      MutationUtil.createFieldMutation('title', 'string', item.title)
    ];
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

  constructor(mutator) {
    console.assert(mutator);
    this._mutator = mutator;
    this._operations = [];
  }

  createItem(type, mutations, name=undefined) {
    console.assert(type && mutations);
    mutations = TypeUtil.flattenArrays(mutations);
    this._operations.push({
      type, mutations, name
    });

    return this;
  }

  updateItem(item, mutations) {
    console.assert(item && mutations);
    mutations = TypeUtil.flattenArrays(mutations);
    this._operations.push({
      item, mutations
    });

    return this;
  }

  commit() {
    // TODO(burdon): Actually batch mutations. (affects optimistic result and reducer)?

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

        item = this._mutator.createItem(type, mutations);
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
        this._mutator.updateItem(item, mutations, itemsById);
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

      props: ({ ownProps, mutate }) => ({

        //
        // Injects a mutator instance into the wrapped components' properties.
        // NOTE: idGenerator must previously have been injected into the properties.
        //
        mutator: new Mutator(ownProps.idGenerator, mutate)
      })
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

  // TODO(burdon): Remove non batch operations.

  /**
   * Executes a create item mutation.
   *
   * @param {string} type
   * @param mutations
   * @return {Item} Optimistic result.
   */
  createItem(type, mutations) {
    mutations = _.compact(_.concat(mutations));

    // Create optimistic result.
    let itemId = this._idGenerator.createId();
    let item = Transforms.applyObjectMutations({ __typename: type, type, id: itemId }, mutations);

    // Fire mutation.
    this._mutate({
      variables: {
        mutations: [
          {
            itemId: ID.toGlobalId(type, itemId),
            mutations
          }
        ],

        // http://dev.apollodata.com/react/mutations.html#optimistic-ui
        optimisticResponse: {
          upsertItems: [
            item
          ]
        }
      }
    });

    return item;
  }

  /**
   * Executes an update item mutation.
   *
   * @param {Item} item
   * @param mutations
   * @param [itemMap] Optional map of cached items.
   * @return {Item} Optimisitc result (NOTE: this will change if the item is being copied).
   */
  updateItem(item, mutations, itemMap=undefined) {
    mutations = _.compact(_.concat(mutations));

    // TODO(burdon): If external namespace (factor out from Database.isExternalNamespace).
    if (item.namespace) {
      console.log('Cloning item: ' + JSON.stringify(item));

      // TODO(burdon): Replace cloned mutations with new mutation.
      return this.createItem(item.type, _.concat(MutationUtil.cloneExternalItem(item), mutations));
    } else {
      // Create optimistic result.
      Transforms.applyObjectMutations(item, mutations);

      // Check for ID references to recently created items.
      // TODO(burdon): Could eventually use schema?
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

      this._mutate({
        variables: {
          mutations: [
            {
              itemId: ID.toGlobalId(item.type, item.id),
              mutations
            }
          ]
        },

        // http://dev.apollodata.com/react/mutations.html#optimistic-ui
        optimisticResponse: {
          upsertItems: [
            item
          ]
        }
      });

      return item;
    }
  }
}

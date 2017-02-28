//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import { ID } from './id';
import { ItemFragment, TaskFragment, ProjectBoardFragment } from './fragments';

//
// Generic mutation.
// TODO(burdon): Extend fragments returned.
//

export const UpsertItemsMutation = gql`
  mutation UpsertItemsMutation($mutations: [ItemMutationInput]!) {
    upsertItems(mutations: $mutations) {
      ...ItemFragment
      ...TaskFragment
      ...ProjectBoardFragment
    }
  }
  
  ${ItemFragment}
  ${TaskFragment}
  ${ProjectBoardFragment}
`;

/*
  Mutation transactions.

  mutator.transaction()
    .createItem({
      ref: 'new_item',
      mutations: []
    })
    .updateItem({
      itemId: 'project-1',
      mutations: [{
        field: "tasks",
        value: {
          set: {
            value: {
              id: "${new_item}.id"  // Reference item created above.
            }
          }
        }
      }]
    })
    .commit();
*/
// TODO(burdon): Change API to support multiple item mutations.
class Transaction {

  constructor(namespace=undefined) {
    this._namespace = namespace;
    this._mutations = [];
  }

  createItem(mutation) {
    this._mutations.push(mutation);
    return this;
  }

  updateItem(mutation) {
    this._mutations.push(mutation);
    return this;
  }

  commit() {
    // TODO(burdon): Iterate and update references.
  }
}

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
  static clone(item) {
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
        mutator: new Mutator(mutate, ownProps.idGenerator),
      })
    });
  }

  /**
   * @param mutate Function provided by apollo.
   * @param idGenerator
   */
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
   * @return {string} Newly created item's ID.
   */
  createItem(type, mutations) {
    let itemId = this._idGenerator.createId();
    this._mutate({
      variables: {
        mutations: [
          {
            itemId: ID.toGlobalId(type, itemId),
            mutations
          }
        ]
      }
    });

    return itemId;
  }

  /**
   * Executes an update item mutation.
   *
   * @param item
   * @param mutations
   * @return {string} Updated item's ID (NOTE: this will change if the item is being copied).
   */
  updateItem(item, mutations) {
    if (item.namespace) {
      console.log('Cloning item: ' + JSON.stringify(item));

      // TODO(burdon): Replace cloned mutations with new mutation.
      return this.createItem(item.type, _.concat(MutationUtil.clone(item), mutations));
    } else {
      this._mutate({
        variables: {
          mutations: [
            {
              itemId: ID.toGlobalId(item.type, item.id),
              mutations
            }
          ]
        }
      });

      return item.id;
    }
  }
}

//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import { TypeUtil } from '../util/type';

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

class Batch {

  constructor(mutator) {
    console.assert(mutator);
    this._mutator = mutator;
    this._operations = [];
  }

  createItem(type, mutations, name=undefined) {
    console.assert(type && mutations);
    this._operations.push({
      type, mutations, name
    });
    return this;
  }

  updateItem(item, mutations) {
    console.assert(item && mutations);
    this._operations.push({
      item, mutations
    });
    return this;
  }

  commit() {
    let created = new Map();
    _.each(this._operations, operation => {
      let { type, item, mutations, name } = operation;
      if (type) {
        // Create item.
        let itemId = this._mutator.createItem(type, mutations);
        if (name) {
          created.set(name, itemId);
        }
      } else {
        // Pre-process mutations.
        TypeUtil.traverse(mutations, (value, key) => {
          let id = _.get(value, 'value.id');
          if (id) {
            let match = id.match(/\$\{(.+)\}/);
            if (match) {
              id = created.get(match[1]);
              _.set(value, 'value.id', id);
            }
          }
        });

        // Update item.
        this._mutator.updateItem(item, mutations);
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

  // TODO(burdon): Batch API (unit test).
  // TODO(burdon): First-cut send multiple mutations operations; second-cut combine (affects optimistic result and reducer)?

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

  batch() {
    return new Batch(this);
  }

  // TODO(burdon): Optimistic response.
  // http://dev.apollodata.com/react/mutations.html#optimistic-ui

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
    // TODO(burdon): If external namespace (factor out from Database.isExternalNamespace0.
    if (item.namespace) {
      console.log('Cloning item: ' + JSON.stringify(item));

      // TODO(burdon): Replace cloned mutations with new mutation.
      return this.createItem(item.type, _.concat(MutationUtil.cloneExternalItem(item), mutations));
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

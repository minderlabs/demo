//
// Copyright 2016 Minder Labs.
//

import { graphql } from 'react-apollo';

import { ID, IdGenerator } from './id';

/**
 * Utils to create mutations.
 */
export class MutationUtil {

  /**
   * Creates a mutation to add or remove a label.
   * @param label
   * @param add
   * @returns {*[]}
   */
  static createLabelUpdate(label, add=true) {
    return [
      {
        field: 'labels',
        value: {
          array: {
            index: add ? 0 : -1,
            value: {
              string: label
            }
          }
        }
      }
    ];
  }

  /**
   * Adds the delete label.
   * @returns {*[]}
   */
  static createDeleteMutation() {
    return MutationUtil.createLabelUpdate('_deleted');
  }

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
      withRef: true,

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
   * @return {string} Newly created item's ID.
   */
  createItem(type, mutations) {
    let itemId = this._idGenerator.createId(type);
    this._mutate({
      variables: {
        itemId: ID.toGlobalId(type, itemId),
        mutations
      }
    });

    return itemId;
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

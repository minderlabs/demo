//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { graphql }  from 'graphql';
import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { introspectionQuery } from 'graphql/utilities';

import { ID } from 'minder-core';

import TypeDefs from './schema.graphql';

/**
 * Resolver map.
 */
export class Resolvers {

  static get typeDefs() {
    return TypeDefs;
  }

  //
  // Resolver Map
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-map
  //
  // TODO(burdon): See args and return values (incl. promise).
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
  //
  // TODO(burdon): Modularize
  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#modularizing
  //

  /**
   * Create the resolver map.
   */
  static getResolvers(database) {
    return {

      //
      // Custom types.
      // http://dev.apollodata.com/tools/graphql-tools/scalars.html
      //

      Date: {
        __parseValue(value) {
          return String(value);
        }
      },

      //
      // Interfaces.
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Unions-and-interfaces
      //

      Item: {
        __resolveType(root, context, info) {
          console.assert(root.type);
          // The type property maps onto the GraphQL schema type name.
          return root.type;
        }
      },

      //
      // Type resolvers.
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-result-format
      //
      // fieldName: (root, args, context, info) => result
      //

      Group: {

        members: (root, args) => {
          return _.map(root.members, itemId => database.getItem('User', itemId));
        }
      },

      User: {

        tasks: (root, args) => {
          let { filter } = args || {};

          filter.type = 'Task';

          let predicate = _.get(filter, 'predicate', { field: 'assignee' });
          switch (predicate.field) {
            case 'owner':
            case 'assignee':
              predicate.value = root.id;
              break;
          }

          return database.queryItems(filter);
        }
      },

      Task: {

        owner: (root) => {
          let userId = root.owner;
          if (userId) {
            return database.getItem('User', userId);
          }
        },

        assignee: (root) => {
          let userId = root.assignee;
          if (userId) {
            return database.getItem('User', userId);
          }
        }
      },

      //
      // Queries
      //

      RootQuery: {

        // TODO(burdon): Get userId from context.

        viewer: (root, { userId }) => {
          let { type, id:localUserId } = ID.fromGlobalId(userId);

          return {
            id: localUserId,
            user: database.getItem('User', localUserId)
          }
        },

        folders: (root, { userId }) => {
          let { type, id:localUserId } = ID.fromGlobalId(userId);
          return database.queryItems({ type: 'Folder' });
        },

        item: (root, { itemId }) => {
          let { type, id:localItemId } = ID.fromGlobalId(itemId);

          return database.getItem(type, localItemId);
        },

        items: (root, { filter, offset, count }) => {
          return database.queryItems(filter, offset, count);
        }
      },

      //
      // Mutations
      // http://dev.apollodata.com/react/receiving-updates.html
      //

      RootMutation: {

        updateItem: (root, { itemId, deltas }) => {
          let { type, id:localItemId } = ID.fromGlobalId(itemId);
          console.log('MUTATION.UPDATE[%s]: %s:%s', localItemId, type, JSON.stringify(deltas));

          // TODO(burdon): Validate type.

          // Get existing item (or undefined).
          let item = database.getItem(type, localItemId);
          if (!item) {
            item = {
              id: itemId,
              type: type,
              title: ''
            };
          }

          Transforms.applyObjectDeltas(item, deltas);

          database.upsertItems([item]);
          return item;
        }
      }
    };
  }
}

/**
 * Apply schema transformations.
 */
class Transforms {

  // TODO(burdon): Tests.
  // TODO(burdon): Factor out operational transformations (client/server).

  /**
   *
   * @param item
   * @param deltas
   */
  static applyObjectDeltas(item, deltas) {
    console.log('APPLY.DELTA[%s:%s]', item.type, item.id);

    // Process value deltas.
    _.each(deltas, (delta) => {
      Transforms.applyObjectDelta(item, delta);
    });
  }

  static applyObjectDelta(obj, delta) {
    let field = delta.field;
    let value = delta.value;

    // TODO(burdon): Introspect for type-checking.

    // Null.
    if (value === undefined) {
      delete obj[field];
      return;
    }

    // Array delta.
    if (value.array !== undefined) {
      obj[field] = Transforms.applyArrayDelta(obj[field] || [], value.array);
      return;
    }

    // Object delta.
    if (value.object !== undefined) {
      obj[field] = Transforms.applyObjectDelta(obj[field] || {}, value.object);
      return;
    }

    // Scalars.
    let scalar = Transforms.scalarValue(value);
    console.assert(scalar);
    obj[field] = scalar;
  }

  /**
   *
   * @param array
   * @param delta
   */
  static applyArrayDelta(array, delta) {
    console.assert(array && delta);

    let scalar = Transforms.scalarValue(delta.value);
    console.assert(scalar);

    if (delta.index == -1) {
      _.pull(array, scalar);
    } else {
      array = _.union(array, [scalar]);
    }

    return array;
  }

  static scalarValue(value) {
    let scalar = undefined;
    const scalars = ['int', 'float', 'string', 'boolean', 'id', 'date'];
    _.forEach(scalars, (s) => {
      if (value[s] !== undefined) {
        scalar = value[s];
        return false;
      }
    });

    return scalar;
  }
}

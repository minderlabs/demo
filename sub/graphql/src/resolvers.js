//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { graphql }  from 'graphql';
import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { introspectionQuery } from 'graphql/utilities';

import { ID, Transforms } from 'minder-core';

import Schema from './schema.graphql';

/**
 * Resolver map.
 */
export class Resolvers {

  static get typeDefs() {
    return Schema;
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

          // TODO(burdon): Move into matcher.
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

        folders: (root) => {
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

        updateItem: (root, { itemId, mutations }) => {
          let { type, id:localItemId } = ID.fromGlobalId(itemId);
          console.log('MUTATION.UPDATE[%s:%s]: %s', type, localItemId, JSON.stringify(mutations));

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

          Transforms.applyObjectMutations(item, mutations);

          database.upsertItems([item]);
          return item;
        }
      }
    };
  }
}

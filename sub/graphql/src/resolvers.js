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
        __resolveType(root) {
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

        members: (root, args, context) => {
          return database.getItems(context, 'User', root.members);
        }
      },

      User: {

        tasks: (root, args, context) => {
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

          return database.queryItems(context, filter);
        }
      },

      Task: {

        owner: (root, args, context) => {
          let userId = root.owner;
          if (userId) {
            return database.getItems(context, 'User', [userId])[0];
          }
        },

        assignee: (root, args, context) => {
          let userId = root.assignee;
          if (userId) {
            return database.getItems(context, 'User', [userId])[0];
          }
        }
      },

      //
      // Queries
      //

      RootQuery: {

        viewer: (root, args, context) => {
          console.log('### CONTEXT: %s', JSON.stringify(context));

          // TODO(burdon): Get from context. Remove ID from schema.
          let { userId } = args;
          let { type, id:localUserId } = ID.fromGlobalId(userId);

          return {
            id: localUserId,
            user: database.getItems(context, 'User', [localUserId])[0]
          }
        },

        folders: (root, args, context) => {
          return database.queryItems(context, { type: 'Folder' });
        },

        item: (root, args, context) => {
          let { itemId } = args;
          let { type, id:localItemId } = ID.fromGlobalId(itemId);

          // TODO(burdon): Get users from user store. Fan-out here.
          return database.getItems(context, type, [localItemId])[0];
        },

        items: (root, args, context) => {
          let { filter, offset, count } = args;

          return database.queryItems(context, filter, offset, count);
        }
      },

      //
      // Mutations
      // http://dev.apollodata.com/react/receiving-updates.html
      //

      RootMutation: {

        updateItem: (root, args, context) => {
          let { itemId, mutations } = args;
          let { type, id:localItemId } = ID.fromGlobalId(itemId);
          console.log('MUTATION.UPDATE[%s:%s]: %s', type, localItemId, JSON.stringify(mutations));

          // TODO(burdon): Validate type.

          // Get existing item (or undefined).
          let item = database.getItems(context, type, [localItemId])[0];
          if (!item.id) {
            item = {
              id: itemId,
              type: type,
              title: ''
            };
          }

          Transforms.applyObjectMutations(item, mutations);

          database.upsertItems(context, [item]);
          return item;
        }
      }
    };
  }
}

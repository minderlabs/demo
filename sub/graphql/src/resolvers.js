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

        // TODO(burdon): Type-based fan-out (read/write). Non in DB layer.

        viewer: (root, args, context) => {
          let { user: { userId, name } } = context;

          return {
            id: userId,

            // TODO(burdon): Call nested resolver below? Just return ID?
            user: { id:userId, user:'User', title: name }
          }
        },

        folders: (root, args, context) => {
          return database.queryItems(context, { type: 'Folder' });
        },

        item: (root, args, context) => {
          let { itemId } = args;
          let { type, id:localItemId } = ID.fromGlobalId(itemId);

          // TODO(burdon): Type fan-out (e.g., user).
          switch (type) {
            case 'User':
              // TODO(burdon): Pass in database for each type? E.g., firebase.
              // https://firebase.google.com/docs/reference/admin/node/admin.database.Query
              // TODO(burdon): Create user store on registration (how? if not ACID?) Sent support request: 7-4297000014709
              // http://stackoverflow.com/questions/38168973/how-to-get-the-list-of-registered-user-in-firebase
              // https://stackoverflow.com/questions/14673708/how-do-i-return-a-list-of-users-if-i-use-the-firebase-simple-username-password
              return { id:localItemId, type, title: 'UNKONWN USER' };

            default:
              return database.getItems(context, type, [localItemId])[0];
          }
        },

        items: (root, args, context) => {
          let { filter, offset, count } = args;

          // TODO(burdon): Type fan-out (e.g., user).
          switch (filter.type) {
            case 'User':

            default:
              return database.queryItems(context, filter, offset, count);
          }
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

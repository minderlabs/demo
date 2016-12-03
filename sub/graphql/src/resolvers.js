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

        // TODO(burdon): Use this "hack" to filter inbox? (viewer.user.tasks).
        // TODO(burdon): Generalize User "type filters" to items that reference the current user?
        tasks: (root, args, context) => {
          let { filter } = args || {};

          // TODO(burdon): Instead of replacing ref here, pass root to database query's matcher?
          // But don't pollute the global execution context.
          let ref = _.get(filter, 'predicate.ref');
          if (ref) {
            filter.predicate.value = _.get(root, ref);
          }

          return database.queryItems(context, filter);
        }
      },

      Task: {

        owner: (root, args, context) => {
          let userId = root.owner;
          if (userId) {
            return database.getItem(context, 'User', userId);
          }
        },

        assignee: (root, args, context) => {
          let userId = root.assignee;
          if (userId) {
            return database.getItem(context, 'User', userId);
          }
        }
      },

      //
      // Queries
      //

      RootQuery: {

        viewer: (root, args, context) => {
          let { user: { userId, email, name } } = context;

          // TODO(burdon): Can the resolver resolve this for us?
          return database.getItem(context, 'User', userId).then(user => ({
            id: userId,
            user
          }));
        },

        folders: (root, args, context) => {
          return database.queryItems(context, { type: 'Folder' });
        },

        item: (root, args, context) => {
          let { itemId } = args;
          let { type, id:localItemId } = ID.fromGlobalId(itemId);

          return database.getItem(context, type, localItemId);
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
          return database.getItem(context, type, localItemId).then(item => {

            // If not found (i.e., insert).
            if (!item.id) {
              item = {
                id: itemId,
                type: type,
                title: ''
              };
            }

            // Apply mutation.
            Transforms.applyObjectMutations(item, mutations);

            return database.upsertItem(context, item);
          });
        }
      }
    };
  }
}

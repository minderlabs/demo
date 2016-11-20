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
          let {type, id:localUserId} = ID.fromGlobalId(userId);
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

          // Process value deltas.
          _.each(deltas, (delta) => {
            let field = delta.field;
            let value = delta.value;

            // TODO(burdon): Introspect for type-checking.
            // TODO(burdon): Factor out operational transformation.

            // TODO(burdon): Handle null (delete field).

            // TODO(burdon): Other scalars.
            if (undefined !== value.string) {
              item[field] = value.string;
            }

            if (undefined !== value.list) {
              let values = item[field] || [];

              // TODO(burdon): Need to apply based on value type).
              let delta = value.list;
              if (delta.index == -1) {
                _.pull(values, delta.value.string);
              } else {
                values = _.union(values, [delta.value.string]);
              }

              item[field] = values;
            }
          });

          console.log('=========================================', JSON.stringify(item));

          database.upsertItems([item]);
          return item;
        }
      }
    };
  }
}

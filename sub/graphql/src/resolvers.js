//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { GraphQLSchema, Kind } from 'graphql';
import { introspectionQuery } from 'graphql/utilities';

import { $$, Logger, ID, Transforms, TypeUtil } from 'minder-core';

import Schema from './schema.graphql';

const logger = Logger.get('resolver');

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
      // http://graphql.org/graphql-js/type/#graphqlscalartype
      //

      Timestamp: {
        __serialize: value => value,
        __parseValue: value => value,
        __parseLiteral: ast => {
          return (ask.kind === Kind.FLOAT) ? parseFloat(ast.value) : null;
        }
      },

      //
      // Interfaces.
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Unions-and-interfaces
      //

      Item: {
        __resolveType(root) {
          console.assert(root.type, 'Invalid type: ' + TypeUtil.stringify(root));

          // The type property maps onto the GraphQL schema type name.
          return root.type;
        }
      },

      //
      // Type resolvers.
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-result-format
      //
      // field: (root, args, context, info) => result
      //

      Group: {

        members: (root, args, context) => {
          return database.getItems(context, 'User', root.members);
        },

        projects: (root, args, context) => {
          let filter = {
            type: 'Project',
            filter: {
              expr: { field: "team", ref: "id" }
            }
          };

          return database.queryItems(context, root, filter);
        }
      },

      User: {

        // TODO(burdon): Generalize for filtered items (like queryItems). Can reference context and root node.
        tasks: (root, args, context) => {
          let { filter } = args || {};
          return database.queryItems(context, root, filter);
        }
      },

      Project: {

        boards: (root, args, context) => {
          return _.map(_.get(root, 'boards'), board => ({
            alias: board.alias,
            title: board.title || '',
            columns: board.columns,

            // Return map as an array.
            itemMeta: _.map(_.get(board, 'itemMeta'), (value, itemId) => ({ itemId, ...value }))
          }));
        },

        team: (root, args, context) => {
          return database.getItem(context, 'Group', root.team);
        },

        tasks: (root, args, context) => {
          return root.tasks && database.getItems(context, 'Task', root.tasks) || [];
        }
      },

      Task: {

        // TODO(burdon): Better way to deal with defaults?
        status: (root, args, context) => {
          return root.status || 0
        },

        project: (root, args, context) => {
          return root.project && database.getItem(context, 'Project', root.project);
        },

        tasks: (root, args, context) => {
          return root.tasks && database.getItems(context, 'Task', root.tasks) || [];
        },

        owner: (root, args, context) => {
          return root.owner && database.getItem(context, 'User', root.owner);
        },

        assignee: (root, args, context) => {
          return root.assignee && database.getItem(context, 'User', root.assignee);
        }
      },

      //
      // Queries
      // NOTE: root is undefined for root-level queries.
      //

      RootQuery: {

        viewer: (root, args, context) => {
          console.assert(context && context.user);

          // TODO(burdon): Fails if not authenticated (no context).
          let { user: { id, email, name } } = context;

          // TODO(burdon): Local/global ID (need to document to memo this).
          // let { type, id:localUserId } = ID.fromGlobalId(userId);

          // TODO(burdon): Can the resolver resolve this for us?
          // return {
          //   id,
          //   user: ID.toGlobalId('User', id)
          // };

          return database.getItem(context, 'User', id).then(user => ({
            id,   // TODO(burdon): Global ID?
            user
          }));
        },

        folders: (root, args, context) => {
          return database.queryItems(context, root, { type: 'Folder', orderBy: { field: 'order' } });
        },

        item: (root, args, context) => {
          let { itemId } = args;
          let { type, id:localItemId } = ID.fromGlobalId(itemId);

          return database.getItem(context, type, localItemId);
        },

        items: (root, args, context) => {
          let { filter, offset, count } = args;

          return database.queryItems(context, root, filter, offset, count);
        },

        search: (root, args, context) => {
          let { filter, offset, count, groupBy } = args;

          return database.search(context, root, filter, offset, count, groupBy);
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
          logger.log($$('UPDATE[%s:%s]: %o', type, localItemId, mutations));

          // TODO(burdon): Validate type.

          // Get existing item (or undefined).
          return database.getItem(context, type, localItemId).then(item => {

            // If not found (i.e., insert).
            // TODO(burdon): Check this is an insert (not a miss due to a bug).
            if (!item.id) {
              item = {
                id: localItemId,
                type: type,
                title: ''
              };
            }

            // Apply mutation.
            Transforms.applyObjectMutations(item, mutations);

            // Upsert database.
            return database.upsertItem(context, item);
          });
        }
      }
    };
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { GraphQLSchema, Kind } from 'graphql';
import { introspectionQuery } from 'graphql/utilities';

import { $$, Logger, ID, Transforms, TypeUtil } from 'minder-core';

import { Database } from './db/database';
import Schema from './gql/schema.graphql';

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
  // https://dev-blog.apollodata.com/graphql-explained-5844742f195e#.vcfu43qao
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

      /**
       * Milliseconds since Unix epoch (_.now() == new Date().getTime()).
       */
      Timestamp: {
        __serialize: value => value,
        __parseValue: value => value,
        __parseLiteral: ast => {
          return (ask.kind === Kind.INT) ? parseInt(ast.value) : null;
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
          return database.getItems(context, 'User', root.members, Database.SYSTEM_NAMESPACE);
        },

        projects: (root, args, context) => {
          let filter = {
            type: 'Project',
            expr: { field: "group", ref: "id" }
          };

          // TODO(burdon): Links.
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

        group: (root, args, context) => {
          let { group } = root;
          return database.getItem(context, 'Group', group, Database.SYSTEM_NAMESPACE);
        },

        tasks: (root, args, context) => {
          let { tasks } = root;
          return root.tasks && database.getItems(context, 'Task', tasks) || [];
        }
      },

      Task: {

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
          return database.getItem(context, 'User', root.owner, Database.SYSTEM_NAMESPACE);
        },

        assignee: (root, args, context) => {
          return root.assignee && database.getItem(context, 'User', root.assignee, Database.SYSTEM_NAMESPACE);
        }
      },

      //
      // Root Viewer.
      //

      Viewer: {

        user: (root, args, context) => {
          let { userId } = context;
          return database.getItem(context, 'User', userId, Database.SYSTEM_NAMESPACE);
        },

        group: (root, args, context) => {
          let { groupId } = context;
          return database.getItem(context, 'Group', groupId, Database.SYSTEM_NAMESPACE)
        },

        folders: (root, args, context) => {
          return database.queryItems(context, root, {
            type: 'Folder',
            orderBy: {
              field: 'order'
            }
          });
        }
      },

      //
      // Queries
      // NOTE: root is undefined for root-level queries.
      //

      RootQuery: {

        viewer: (root, args, context) => {
          return {};
        },

        item: (root, args, context) => {
          let { itemId } = args;

          let { type, id:localItemId } = ID.fromGlobalId(itemId);
          let namespace = Database.getNamespaceForType(type);

          return database.getItem(context, type, localItemId, namespace);
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
          let namespace = Database.getNamespaceForType(type);
          logger.log($$('UPDATE[%s:%s]: %o', type, localItemId, mutations));

          // Get existing item (or undefined).
          return database.getItem(context, type, localItemId, namespace).then(item => {

            // If not found (i.e., insert).
            // TODO(burdon): Check this is an insert (not a miss due to a bug); use version?
            if (!item) {
              item = {
                id: localItemId,
                type: type
              };
            }

            // Apply mutations.
            Transforms.applyObjectMutations(item, mutations);

            // Upsert item.
            return database.upsertItem(context, item, namespace);
          });
        }
      }
    };
  }
}

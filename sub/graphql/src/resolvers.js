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

const AuthError = new Error('Not authenticated.');

/**
 * Resolver map.
 */
export class Resolvers {

  // TODO(burdon): Remove.
  static getNamespaceForType(type) {
    switch (type) {
      case 'User':
      case 'Group':
        return Database.NAMESPACE.SYSTEM;

      case 'Folder':
        return Database.NAMESPACE.SETTINGS;

      default:
        return Database.NAMESPACE.USER;
    }
  }

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
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItems(context, 'User', root.members);
        },

        projects: (root, args, context) => {
          let filter = {
            type: 'Project',
            expr: { field: "group", ref: "id" }
          };

          // TODO(burdon): Links.
          return database.getQueryProcessor(Database.NAMESPACE.USER).queryItems(context, root, filter);
        }
      },

      User: {

        // TODO(burdon): Generalize for filtered items (like queryItems). Can reference context and root node.
        tasks: (root, args, context) => {
          let { filter } = args || {};
          return database.getItemStore().queryItems(context, root, filter);
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
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'Group', group);
        },

        tasks: (root, args, context) => {
          let { tasks } = root;
          if (tasks) {
            return database.getItemStore(Database.NAMESPACE.USER).getItems(context, 'Task', tasks);
          } else {
            return [];
          }
        }
      },

      Task: {

        status: (root, args, context) => {
          return root.status || 0
        },

        project: (root, args, context) => {
          if (root.project) {
            return database.getItemStore(Database.NAMESPACE.USER).getItem(context, 'Project', root.project);
          }
        },

        // TODO(burdon): Links.
        tasks: (root, args, context) => {
          if (root.tasks) {
            return database.getItemStore(Database.NAMESPACE.USER).getItems(context, 'Task', root.tasks);
          } else {
            return [];
          }
        },

        owner: (root, args, context) => {
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', root.owner);
        },

        assignee: (root, args, context) => {
          if (root.assignee) {
            return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', root.assignee);
          }
        }
      },

      //
      // Root Viewer.
      //

      Viewer: {

        user: (root, args, context) => {
          let { userId } = context;
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', userId);
        },

        group: (root, args, context) => {
          let { groupId } = context;
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'Group', groupId);
        },

        folders: (root, args, context) => {
          return database.getQueryProcessor(Database.NAMESPACE.SETTINGS).queryItems(context, root, {
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
          let { userId } = context;
          if (!userId) {
            throw AuthError;
          }

          return {};
        },

        item: (root, args, context) => {
          let { userId } = context;
          if (!userId) {
            throw AuthError;
          }

          let { itemId } = args;
          let { type, id:localItemId } = ID.fromGlobalId(itemId);

          // TODO(burdon): Should be from args.
          let namespace = Resolvers.getNamespaceForType(type);

          return database.getItemStore(namespace).getItem(context, type, localItemId);
        },

        // TODO(burdon): Document difference from search (no text index? i.e., move to ItemStore?)
        items: (root, args, context) => {
          let { userId } = context;
          if (!userId) {
            throw AuthError;
          }

          let { filter, offset, count } = args;
          let { namespace } = filter;

          return database.getQueryProcessor(namespace).queryItems(context, root, filter, offset, count);
        },

        search: (root, args, context) => {
          let { userId } = context;
          if (!userId) {
            throw AuthError;
          }

          let { filter, offset, count, groupBy } = args;

          return database.search(context, root, filter, offset, count, groupBy);
        }
      },

      //
      // Mutations
      // Apply ItemMutationInput
      // http://dev.apollodata.com/react/receiving-updates.html
      //

      RootMutation: {

        upsertItems: (root, args, context) => {
          let { userId } = context;
          if (!userId) {
            throw AuthError;
          }

          let { mutations:itemMutations } = args;

          // TODO(burdon): Should be from Mutator args. (default to USER)? Does UX currently update Group/User?
//        let namespace = Resolvers.getNamespaceForType(type);
          let namespace = Database.NAMESPACE.USER;
          let itemStore = database.getItemStore(namespace);

          return Promise.all(_.map(itemMutations, itemMutation => {
            let { itemId, mutations } = itemMutation;
            let { type, id:localItemId } = ID.fromGlobalId(itemId);
            logger.log($$('UPDATE[%s:%s]: %o', type, localItemId, mutations));

            //
            // Get and update item.
            //
            return itemStore.getItem(context, type, localItemId)
              .then(item => {

                // If not found (i.e., insert).
                // TODO(burdon): Check this is an insert (not a miss due to a bug); use version?
                if (!item) {
                  item = {
                    id: localItemId,
                    type: type
                  };
                }

                //
                // Apply mutations.
                //
                return Transforms.applyObjectMutations(item, mutations);
              });
          }))

            //
            // Upsert items.
            //
            .then(results => {
              let items = TypeUtil.flattenArrays(results);
              return itemStore.upsertItems(context, items)
            })

            //
            // Trigger notifications.
            //
            .then(items => {
              // TODO(burdon): Pass clientId from context.
              // TODO(burdon): Move mutation notifications to Notifier/QueryRegistry.
              database.fireMuationNotification(context, items);

              return items;
            });
        }
      }
    };
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { GraphQLSchema, Kind } from 'graphql';
import { concatenateTypeDefs } from 'graphql-tools';
import { introspectionQuery } from 'graphql/utilities';

import { $$, Logger, HttpError, Database, ID, ItemStore, TypeUtil } from 'minder-core';

import Framework from './gql/framework.graphql';
import Schema from './gql/schema.graphql';

const logger = Logger.get('resolver');

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
    return concatenateTypeDefs([Framework, Schema])
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
   * GraphQL Resolvers.
   *
   * The context is set via the graphqlRouter's contextProvider.
   *
   * context: {
   *   userId,
   *   clientId
   * }
   */
  static getResolvers(database) {
    return {

      //
      // Custom types.
      // http://dev.apollodata.com/tools/graphql-tools/scalars.html
      // http://graphql.org/graphql-js/type/#graphqlscalartype
      //

      /**
       * Milliseconds since Unix epoch (_.now() === Date.now()).
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
        __resolveType(obj) {
          // TODO(burdon): Check type map.
          console.assert(obj.type, 'Invalid type: ' + TypeUtil.stringify(obj));

          // The type property maps onto the GraphQL schema type name.
          return obj.type;
        }
      },

      //
      // Type resolvers:
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
      // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-result-format
      //
      // Resolver Tree:
      // https://dev-blog.apollodata.com/graphql-explained-5844742f195e
      //
      // field: (obj, args, context, info) => {null|[]|Promise|scalar|Object} result
      //

      Group: {

        members: (obj, args, context) => {
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItems(context, 'User', obj.members);
        },

        projects: (obj, args, context) => {
          // NOTE: Group Items should not directly reference User store items (so we query for them).
          let filter = {
            type: 'Project',
            expr: {
              field: "group",
              ref: "id"
            }
          };

          return database.getQueryProcessor(Database.NAMESPACE.USER).queryItems(context, obj, filter);
        }
      },

      User: {

        title: (obj) => {
          if (!obj.displayName) {
            logger.warn('Missing displayName: ' + obj.id);
          }
          return obj.displayName || '';
        },

        // TODO(burdon): Generalize for filtered items (like queryItems). Can reference context and obj node.
        tasks: (obj, args, context) => {
          let { filter } = args || {};
          return database.getItemStore().queryItems(context, obj, filter);
        },

        groups: (obj) => {
          // TODO(madadam): Intersect with groups visible to the Viewer.
          // TODO(madadam): Different interface to get SystemStore. getGroup() is not a method of ItemStore interface.
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getGroups(obj.id);
        }
      },

      Project: {

        boards: (obj, args, context) => {
          return _.map(_.get(obj, 'boards'), board => ({
            alias: board.alias,
            title: board.title || '',
            columns: board.columns,

            // Flatten map to an array.
            itemMeta: _.map(_.get(board, 'itemMeta'), (value, itemId) => ({ itemId, ...value }))
          }));
        },

        group: (obj, args, context) => {
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'Group', obj.group);
        },

        tasks: (obj, args, context) => {
          if (obj.tasks) {
            return database.getItemStore(Database.NAMESPACE.USER).getItems(context, 'Task', obj.tasks);
          } else {
            return [];
          }
        }
      },

      Task: {

        status: (obj, args, context) => {
          return obj.status || 0
        },

        project: (obj, args, context) => {
          if (obj.project) {
            return database.getItemStore(Database.NAMESPACE.USER).getItem(context, 'Project', obj.project);
          }
        },

        tasks: (obj, args, context) => {
          if (obj.tasks) {
            return database.getItemStore(Database.NAMESPACE.USER).getItems(context, 'Task', obj.tasks);
          } else {
            return [];
          }
        },

        owner: (obj, args, context) => {
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', obj.owner);
        },

        assignee: (obj, args, context) => {
          if (obj.assignee) {
            return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', obj.assignee);
          }
        }
      },

      Contact: {

        tasks: (obj, args, context) => {
          if (obj.tasks) {
            return database.getItemStore(Database.NAMESPACE.USER).getItems(context, 'Task', obj.tasks);
          } else {
            return [];
          }
        },

        // TODO(burdon): Assign User Contact on Login.
        user: (obj, args, context) => {
          if (obj.email) {
            let filter = {
              type: 'User',
              expr: {
                field: 'email',
                value: {
                  string: obj.email
                }
              }
            };

            // TODO(madadam): Factor out with Slackbot.getUserByEmail.
            let queryProcessor = database.getQueryProcessor(Database.NAMESPACE.SYSTEM);
            return queryProcessor.queryItems({}, {}, filter)
              .then(items => {
                if (items.length > 0) {
                  console.assert(items.length === 1);
                  return items[0];
                }
              });
          }
        }
      },

      //
      // Root Viewer.
      //

      Viewer: {

        user: (obj, args, context) => {
          let { userId } = context;
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', userId);
        },

        groups: (obj, args, context) => {
          let { buckets } = context;
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItems(context, 'Group', buckets);
        },

        folders: (obj, args, context) => {
          return database.getQueryProcessor(Database.NAMESPACE.SETTINGS).queryItems(context, obj, {
            type: 'Folder',
            orderBy: {
              field: 'order'
            }
          });
        }
      },

      //
      // Queries
      // NOTE: obj is undefined for root-level queries.
      //

      RootQuery: {

        viewer: (obj, args, context) => {
          Resolvers.checkAuthentication(context);

          return {};
        },

        // TODO(burdon): items
        item: (obj, args, context) => {
          Resolvers.checkAuthentication(context);

          let { itemId } = args;
          let { type, id:localId } = ID.fromGlobalId(itemId);

          // TODO(burdon): Should be from args or ID.
          let namespace = Resolvers.getNamespaceForType(type);

          return database.getItemStore(namespace).getItem(context, type, localId);
        },

        search: (obj, args, context) => {
          Resolvers.checkAuthentication(context);

          let { filter } = args;

          return database.search(context, obj, filter);
        }
      },

      //
      // Mutations
      // Apply ItemMutationInput
      // http://dev.apollodata.com/react/receiving-updates.html
      //

      RootMutation: {

        upsertItems: (obj, args, context) => {
          Resolvers.checkAuthentication(context);

          // TODO(burdon): Enforce bucket.

          let { namespace=Database.NAMESPACE.USER, mutations } = args;
          logger.log($$('UPDATE[%s]: %o', namespace, mutations));

          let itemStore = database.getItemStore(namespace);
          return ItemStore.applyMutations(itemStore, context, mutations)

            //
            // Trigger notifications.
            //
            .then(items => {

              // TODO(burdon): Move mutation notifications to Notifier/QueryRegistry.
              database.fireMutationNotification(context, mutations, items);
              return items;
            });
        }
      }
    };
  }

  static checkAuthentication(context) {
    if (!context.userId) {
      // TODO(burdon): Test user is active also.
      // NOTE: getUserFromHeader should have already thrown before getting here.
      throw new HttpError(401);
    }

    if (!context.clientId) {
      throw new HttpError('Invalid client.', 400);
    }
  }
}

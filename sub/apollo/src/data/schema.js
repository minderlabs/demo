//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

import { graphql }  from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { introspectionQuery } from 'graphql/utilities';

import TypeDefs from './schema.graphql';
import Database from './database';

// TODO(burdon): Tests.
// TODO(burdon): Factor out common schema (and database) for all demos?
// TODO(burdon): Client mocking (use same schema) http://dev.apollodata.com/tools/graphql-tools/mocking.html

/**
 * Schema factory.
 */
export default class SchemeFactory {

  constructor(database) {
    this._database = database;
    this._typeMap = new Map();
  }

  /**
   * Create the executable schema.
   * @returns {*}
   */
  makeExecutableSchema() {
    const resolvers = this.getResolvers(this._typeMap, this._database);

    // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html
    console.log('Creating schema...');
    const schema = makeExecutableSchema({
      typeDefs: TypeDefs,
      resolvers: resolvers,
      logger: {
        log: (error) => console.log('Schema Error', error)
      }
    });

    /**
     * Create the type map for introspection.
     */
    console.log('Creating schema defs...');
    return graphql(schema, introspectionQuery).then((result) => {
      let jsonSchema = result.data.__schema;
      _.each(jsonSchema.types, (type) => {
        this._typeMap.set(type.name, type);
      });

      return schema;
    });
  }

  //
  // Resolver Map
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-map
  //
  // TODO(burdon): See args and return values (incl. promise).
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
  // TODO(burdon): Modularize
  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#modularizing
  //

  /**
   * Create the resolver map.
   */
  getResolvers() {
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
          return _.map(root.members, itemId => this._database.getItem('User', itemId));
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

          return this._database.queryItems(filter);
        }
      },

      Task: {

        owner: (root) => {
          let userId = root.owner;
          if (userId) {
            return this._database.getItem('User', userId);
          }
        },

        assignee: (root) => {
          let userId = root.assignee;
          if (userId) {
            return this._database.getItem('User', userId);
          }
        }
      },

      //
      // Queries
      //

      RootQuery: {

        // TODO(burdon): Get userId from context.

        viewer: (root, { userId }) => {
          let { type, id:localUserId } = Database.fromGlobalId(userId);
          return {
            id: localUserId,
            user: this._database.getItem('User', localUserId)
          }
        },

        folders: (root, { userId }) => {
          let {type, id:localUserId} = Database.fromGlobalId(userId);
          return this._database.queryItems({ type: 'Folder' });
        },

        item: (root, { itemId }) => {
          let { type, id:localItemId } = Database.fromGlobalId(itemId);

          return this._database.getItem(type, localItemId);
        },

        items: (root, { filter, offset, count }) => {
          return this._database.queryItems(filter, offset, count);
        }
      },

      //
      // Mutations
      // http://dev.apollodata.com/react/receiving-updates.html
      //

      RootMutation: {

        updateItem: (root, { itemId, deltas }) => {
          let { type, id:localItemId } = Database.fromGlobalId(itemId);
          console.log('MUTATION.UPDATE[%s]', type, localItemId, deltas);

          let item = this._database.getItem(type, localItemId);
          console.assert(item);

          // Process value deltas.
          _.each(deltas, (delta) => {
            let field = delta.field;
            let value = delta.value;

            // TODO(burdon): If scalar then just set.
            if (value.list) {
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

          this._database.upsertItems([item]);
          return item;
        }
      }
    };
  }
}

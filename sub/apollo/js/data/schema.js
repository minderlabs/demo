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

// TODO(burdon): Inject field-level resolvers (e.g., User.tasks); where not just ID reference.

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
  // Resolvers
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html
  // http://graphql.org/learn/execution/#root-fields-resolvers
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
          return root.type;
        }
      },


      // TODO(burdon): Replace reduceItem below and implement all ID lookup and query members.

      User: {
        title: (obj, args, context) => {
          return obj.title;
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

          // TODO(burdon): Should only return required fields and resolve IDs -> objects.
          return this.resovleItem(this._database.getItem(type, localItemId));
        },

        items: (root, { filter, offset, count }) => {
          // TODO(burdon): Should only return required fields and resolve IDs -> objects.
          return _.map(this._database.queryItems(filter, offset, count), item => this.resovleItem(item));
        }
      },

      //
      // Mutations
      // http://dev.apollodata.com/react/receiving-updates.html
      //

      RootMutation: {

        // TODO(burdon): Unit test.
        // TODO(burdon): Document where mutation should set ID for object reference.

        updateItem: (root, { itemId, deltas }) => {
          let {type, id:localItemId} = Database.fromGlobalId(itemId);
          console.log('MUTATION.UPDATE[%s]', type, localItemId, deltas);

          let item = this._database.getItem(type, localItemId);
          console.assert(item);

          // Process value deltas.
          _.each(deltas, (delta) => {
            let key = delta.key;
            let value = delta.value;

            // TODO(burdon): If scalar then just set.
            if (value.list) {
              let values = item[key] || [];

              // TODO(burdon): Need to apply based on value type).
              let delta = value.list;
              if (delta.index == -1) {
                _.pull(values, delta.value.string);
              } else {
                values = _.union(values, [delta.value.string]);
              }

              item[key] = values;
            }
          });

          this._database.upsertItems([item]);
          return item;
        }
      }
    };
  }

  /**
   * Resolve specific fields (from introspection).
   * E.g., Interpret object types as a reference to another item by Id returned by database field.
   *
   * @param item
   */
  resovleItem(item) {
    console.assert(item.type);
    let typeDef = this._typeMap.get(item.type);
    _.each(typeDef.fields, (field) => {

      // TODO(burdon): Note that is database dependent (schema can't tell us that).
      // TODO(burdon): Note this could potentially be recursive (need to check what is being asked for).
      //               I.e., how many levels.


      let fieldType = field.type;

      // TODO(burdon): AST DEFS ARE RECURSIVE: e.g., members => NON_NULL => LIST. Need more complex parser.
      let nonNull = false;
      if (fieldType.kind === 'NON_NULL') {
        fieldType = fieldType.ofType;

        // TODO(burdon): Warn if null.
        nonNull = true;
      }

      //
      // TODO(burdon): RESOLVE IS RECURSIVE SO MAKE SURE ONLY GET FIELDS THAT ARE REQUESTED.
      //

      switch (fieldType.kind) {
        case 'OBJECT': {
          let linkedItemId = item[field.name];
          console.assert(linkedItemId || !nonNull);
          if (linkedItemId) {
            item[field.name] = this.resovleItem(this._database.getItem(fieldType.name, linkedItemId));
          }

          break;
        }

        case 'LIST': {
          // TODO(burdon): Only one level deep! (not list of lists).
          let listType = fieldType.ofType;
          switch (listType.kind) {
            case 'OBJECT': {
              // Query or ID lookup?
              if (!_.isEmpty(field.args)) {

                // TODO(burdon): Get values from root resolver handler.
                // https://github.com/facebook/graphql/issues/204 (ARGS IN FRAGMENTS)

                // TODO(burdon): Something isn't right here: framework should be walking the tree for us. And passing fields.
                // http://graphql.org/learn/execution/#list-resolvers
                // OTHER LIBS?

                // TODO(burdon): Hack to resolve user tasks (create parser map Type.field).
                // TODO(burdon): Getting complicated -- need unit tests (move to graphql sub).
                console.log('========FIELD=========', JSON.stringify(field));
                let filter = { labels: ['xxx'] };

                // TODO(burdon): Use filter.
                item[field.name] = _.map(this._database.queryItems(filter), (item) => {
                  return this.resovleItem(item);
                });
              } else {
                item[field.name] = _.map(item[field.name], (id) => {
                  return this.resovleItem(this._database.getItem(listType.name, id));
                });
              }

              break;
            }
          }
        }
      }
    });

    // TODO(burdon): Build up resolved item from fields of database item.
    return item;
  }
}

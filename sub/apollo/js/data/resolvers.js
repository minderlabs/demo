//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

//
// Resolvers
// http://dev.apollodata.com/tools/graphql-tools/resolvers.html
// TODO(burdon): See args and return values (incl. promise).
// http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
//
// TODO(burdon): Tests.
// TODO(burdon): Factor out common schema (and database) for all demos?
// TODO(burdon): Client mocking (use same schema) http://dev.apollodata.com/tools/graphql-tools/mocking.html
//

// TODO(burdon): Generate JSON object?
// console.log(Object.keys(schema.getTypeMap()));

// TODO(burdon): Modularize
// http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#modularizing

export default (database) => {

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

    //
    // Queries
    //

    RootQuery: {

      // TODO(burdon): User ID for all (or pass in request context?)

      viewer: (root, { userId }) => {
        return {
          id: userId,
          user: {
            id: userId,
            ...database.getItem(userId)
          }
        };
      },

      folders: (root, { userId }) => {
        return database.queryItems({ type: 'Folder' });
      },

      item: (root, { itemId }) => {
        return database.getItem(itemId);
      },

      items: (root, { filter, offset, count }) => {
        return database.queryItems(filter, offset, count);
      }
    },

    //
    // Mutations
    //

    RootMutation: {

      // TODO(burdon): Unit test.
      // TODO(burdon): Move schema to ../graphql

      updateItem: (root, { itemId, deltas }) => {
        console.log('MUTATION.UPDATE', itemId, deltas);

        let item = database.getItem(itemId);
        console.assert(item);

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

        database.upsertItems([item]);
        return item;
      }
    }
  };
}

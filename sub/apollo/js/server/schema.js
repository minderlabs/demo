//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';
import { makeExecutableSchema } from 'graphql-tools';

import { Chance } from 'chance';

import typeDefs from './schema.graphql';

// TODO(burdon): Tests.
// TODO(burdon): Factor out common schema (and database) for all demos?
// TODO(burdon): Client mocking (use same schema) http://dev.apollodata.com/tools/graphql-tools/mocking.html

//
// Schema
// http://graphql.org/learn
//

const DATA = {

  User: {
    minder: {
      title: 'Minder',
      username: 'minder'
    }
  },

  Item: {}
};

const generate = (n) => {
  console.log('GENERATE: %d', n);

  const chance = new Chance(0);
  for (let i = 1; i <= n; i++) {
    let itemId = `i-${_.padStart(i, 3, '0')}`;

    DATA.Item[itemId] = {
      id: itemId,
      type: 'City',
      title: chance.city(),
      labels: chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],
      geo: {
        lat: chance.latitude(),
        lng: chance.longitude()
      }
    }
  }
};

//
// Resolvers
// TODO(burdon): Factor out database.
// http://dev.apollodata.com/tools/graphql-tools/resolvers.html
// TODO(burdon): See args and return values (incl. promise).
// http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
//

const resolvers = {

  //
  // Custom types.
  // http://dev.apollodata.com/tools/graphql-tools/scalars.html
  //

  Void: {
    __parseValue(value) {
      // TODO(burdon): Other types.
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

    viewer: (root, { userId }) => {
      console.log('GET.VIEWER[%s]', userId);
      return {
        id: userId,
        user: { id: userId, type: 'User', ...DATA.User[userId] }
      };
    },

    item: (root, { itemId }) => {
      console.log('GET.ITEM[%s]', itemId);
      return DATA.Item[itemId];
    },

    items: (root, { text, offset, count }) => {
      console.log('GET.ITEMS[%d:%d][%s]', offset, count, text);
      text = _.lowerCase(text);

      let items = [];
      _.each(DATA.Item, (item, itemId) => {
        if (text && _.lowerCase(item.title).indexOf(text) == -1) {
          return;
        }

        items.push(item);
      });

      items = _.sortBy(items, ['title']);
      items = _.slice(items, offset, offset + count);

      return items;
    }
  },

  //
  // Mutations
  //

  RootMutation: {

    updateLabels: (root, { itemId, labels }) => {
      console.log('MUTATION.UPDATE_LABELS', itemId, labels);

      let item = DATA.Item[itemId];
      item.labels = item.labels || [];
      _.each(labels, (delta) => {
        if (delta.index == -1) {
          _.pull(item.labels, delta.value);
        } else {
          item.labels = _.union(item.labels, [delta.value]);
        }
      });

      return item;
    }
  }
};

//
// Schema
//
//

const schema = makeExecutableSchema({ typeDefs, resolvers });

generate(100);

export default schema;

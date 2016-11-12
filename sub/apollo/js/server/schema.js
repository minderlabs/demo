//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';
import { Kind } from 'graphql/language';
import { makeExecutableSchema } from 'graphql-tools';

import { Chance } from 'chance';

//
// Schema
// http://graphql.org/learn
//

// TODO(burdon): Factor out common schema (and database) for all demos?

// TODO(burdon): Factor out (share with sub/graphql).
// TODO(burdon): Client mocking (use same schema) http://dev.apollodata.com/tools/graphql-tools/mocking.html

const typeDefs = `
  
  # Custom scalars.
  # http://graphql.org/learn/schema/#scalar-types
  # http://dev.apollodata.com/tools/graphql-tools/scalars.html
  # http://dev.apollodata.com/tools/graphql-tools/resolvers.html
  # https://github.com/mugli/learning-graphql/blob/master/7.%20Deep%20Dive%20into%20GraphQL%20Type%20System.md
  # http://graphql.org/graphql-js/type

  scalar Date
  
  scalar Void
    
  input ArrayDelta {
    index: Int
    value: Void!
  }

  # Root node
  
  type Viewer {
    id: ID!
    user: User!
  }

  # Node types

  type User {
    id: ID!
    name: String!
  }
  
  type Item {
    id: ID!
    title: String!
    labels: [String]!
  }

  # Queries

  type RootQuery {
    viewer(userId: ID!): Viewer!
    item(itemId: ID!): Item!
    items(text: String, offset: Int, count: Int): [Item]!
  }
  
  # Mutations
  
  type RootMutation {
    updateLabels(itemId: ID!, labels: [ArrayDelta]!): Item!
  }
  
  # Schema

  schema {
    query: RootQuery
    mutation: RootMutation
  }

`;

const DATA = {

  User: {
    minder: {
      name: 'Minder'
    }
  },

  Item: {}
};

const generate = (n) => {

  const chance = new Chance(0);

  for (let i = 1; i <= n; i++) {
    let itemId = `i-${_.padStart(i, 3, '0')}`;

    DATA.Item[itemId] = {
      id: itemId,
      title: chance.city(),
      labels: chance.bool({ likelihood: 20 }) ? ['_favorite'] : []
    }
  }
};

//
// Resolvers
// http://dev.apollodata.com/tools/graphql-tools/resolvers.html
//

const resolvers = {

  // TODO(burdon): Build map from Data (and set ID).
  // TODO(burdon): What is the node property?

  //
  // Custom types.
  // http://dev.apollodata.com/tools/graphql-tools/scalars.html
  //

  Void: {
    // TODO(burdon): Other types.
    __parseValue(value) {
      return String(value);
    }
  },

  //
  // Queries
  //

  RootQuery: {

    viewer: (node, { userId }) => {
      console.log('GET.VIEWER[%s]', userId);
      return {
        id: userId,
        user: DATA.User[userId]
      };
    },

    item: (node, { itemId }) => {
      console.log('GET.ITEM[%s]', itemId);
      return DATA.Item[itemId];
    },

    items: (node, { text, offset, count }) => {
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

    updateLabels: (node, { itemId, labels }) => {
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

const schema = makeExecutableSchema({ typeDefs, resolvers });

generate(100);

export default schema;

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';
import { Kind } from 'graphql/language';
import { makeExecutableSchema } from 'graphql-tools';


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
    viewer(userId: ID!): Viewer
    items(text: String): [Item]!
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

  Item: {
    "i-001": { title: "New York",   labels: ['_favorite']},
    "i-002": { title: "Los Angeles" },
    "i-003": { title: "London"      },
    "i-004": { title: "Tokyo"       },
    "i-005": { title: "Bangkok"     },
    "i-006": { title: "Paris"       },
    "i-007": { title: "Amsterdam"   },
    "i-008": { title: "Hong Kong"   },
    "i-009": { title: "Singapore"   }
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
      console.log('QUERY.VIEWER[%s]', userId);
      return {
        id: userId,
        user: DATA.User[userId]
      };
    },

    items: (node, { text }) => {
      console.log('QUERY.ITEMS[%s]', text);
      text = _.lowerCase(text);

      let items = [];
      _.each(DATA.Item, (item, itemId) => {
        if (text && _.lowerCase(item.title).indexOf(text) == -1) {
          return;
        }

        items.push(_.defaults({}, item, { id: itemId, labels: [] }));
      });

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

      return _.defaults({}, item, { id: itemId });
    }
  }
};

//
// Schema
//

const schema = makeExecutableSchema({ typeDefs, resolvers });

export default schema;

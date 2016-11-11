//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

const graphqlTools = require('graphql-tools');


//
// Schema
// http://graphql.org/learn
//

// TODO(burdon): Use /relay/dist/schema.graphql?
// TODO(burdon): Factor out (share with sub/graphql).
// TODO(burdon): Client mocking (use same schema) http://dev.apollodata.com/tools/graphql-tools/mocking.html


const typeDefs = `
  
  type Viewer {
    id: ID!
    user: User!
  }

  type User {
    id: ID!
    name: String!
  }
  
  type Item {
    id: ID!
    title: String!
  }

  type RootQuery {
    viewer(userId: ID!): Viewer
    items(userId: ID!, text: String): [Item]!
  }

  schema {
    query: RootQuery
  }

`;

const DATA = {

  User: {
    minder: {
      name: 'Minder'
    }
  },

  Item: {
    "i-001": { title: "New York" },
    "i-002": { title: "Los Angeles" },
    "i-003": { title: "London" },
    "i-004": { title: "Tokyo" },
    "i-005": { title: "Bangkok" },
    "i-006": { title: "Paris" },
    "i-007": { title: "Amsterdam" },
    "i-008": { title: "Hong Kong" },
    "i-009": { title: "Singapore" }
  }
};

const resolvers = {

  // TODO(burdon): What is the node property?

  RootQuery: {

    viewer: (node, { userId }) => {
      console.log('VIEWER.GET[%s]', userId);
      return {
        id: userId,
        user: DATA.User[userId]
      };
    },

    items: (node, { userId, text }) => {
      console.log('ITEMS.GET[%s]', text);
      text = _.lowerCase(text);

      let items = [];
      _.each(DATA.Item, (item, itemId) => {
        if (text && _.lowerCase(item.title).indexOf(text) == -1) {
          return;
        }

        items.push(_.merge({ id: itemId }, item));
      });

      return items;
    }
  }
};


const schema = graphqlTools.makeExecutableSchema({ typeDefs, resolvers });

export default schema;

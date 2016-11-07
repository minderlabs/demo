//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import {
  graphql,
  GraphQLID,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';

// https://github.com/apollostack/graphql-tools
import { makeExecutableSchema, mockServer } from 'graphql-tools';

import schema from './data/schema.graphql';
import { DATA, resolvers } from './data/testing/resolvers';

//
// 3 Tests (Native GraphQL API + 2 Apollo graphql-tools).
//

const query = `
  { 
    user(id: "test") {
      id
      name
    }
  }
`;

const test = (result, done) => {
  if (result.errors) {
    console.error(result.errors);
    fail();
  } else {
    console.log(JSON.stringify(result.data.user));
    expect(result.data.user.name).to.equal(DATA.User.test.name);
    done();
  }
};

//
// Mock server.
// https://github.com/apollostack/graphql-tools
//

describe('Test Mock Server', () => {

  // http://graphql.org/blog/mocking-with-graphql
  let server = mockServer(schema, resolvers);

  it('Should just work.', (done) => {
    server.query(query).then((result) => {
      test(result, done);
    });
  });
});

//
// Executable schema.
// https://github.com/graphql/graphql-js
// https://github.com/apollostack/frontpage-server/blob/master/data/schema.js
//

describe('Test Executable Schema', () => {

  // Convert to resolver map.
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html
  let resolverMap = {};
  _.each(resolvers, (f, key) => {
    resolverMap[key] = f();
  });

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#makeExecutableSchema
  let jsSchema = makeExecutableSchema({
    typeDefs: schema,
    resolvers: resolverMap,
    logger: { log: (error) => console.error(error) }
  });

  it('Should just work.', (done) => {
    graphql(jsSchema, query).then((result) => {
      test(result, done);
    });
  });
});

//
// Native GraphQL API.
// https://github.com/graphql/graphql-js
//

describe('Test GraphQL API', () => {

  let schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: {
        user: {
          type: new GraphQLObjectType({
            name: 'User',
            fields: {
              id: {
                type: GraphQLID
              },
              name: {
                type: GraphQLString,
                resolve: (o) => o.name
              },
            }
          }),
          args: {
            id: {
              type: GraphQLID
            }
          },
          resolve: (parent, args) => {
            return { id: args.id, ...DATA.User[args.id] };
          }
        }
      }
    })
  });

  it('Should just work.', (done) => {
    graphql(schema, query).then((result) => {
      test(result, done);
    });
  });
});

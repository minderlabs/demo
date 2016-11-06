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

import { makeExecutableSchema, mockServer } from 'graphql-tools';

import schema from './data/schema.graphql';

import { DATA, resolvers } from './data/testing/resolvers';

// TODO(burdon): Add ID (toGlobal) in all resolves.


//
// Tests (3 equivalent variants).
//

const query = `
  { 
    user(id: "test") {
      id
      name
    }
  }
`;

describe('Test Mock Schema', () => {

  let server = mockServer(schema, resolvers);

  it('Should just work.', (done) => {
    server.query(query).then((result) => {
      if (result.errors) {
        console.error(result.errors);
        fail();
      } else {
        expect(result.data.user.name).to.equal(DATA.User.test.name);
        done();
      }
    });
  });
});

describe('Test Executable Schema', () => {

  // Convert to resolver map.
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html
  let resolverMap = {};
  _.each(resolvers, (f, key) => {
    resolverMap[key] = f();
  });

  // Executable schema.
  // https://github.com/graphql/graphql-js
  // https://github.com/apollostack/frontpage-server/blob/master/data/schema.js

  const logger = {
    log: (error) => console.error(error)
  };

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#makeExecutableSchema
  let jsSchema = makeExecutableSchema({
    typeDefs: [schema],
    resolvers: resolverMap,
    logger
  });

  it('Should just work.', (done) => {

    graphql(jsSchema, query).then((result) => {
      if (result.errors) {
        console.error(result.errors);
        fail();
      } else {
        expect(result.data.user.name).to.equal(DATA.User.test.name);
        done();
      }
    });
  });
});

describe('Test Custom Schema', () => {

  // Executable schema.
  // https://github.com/graphql/graphql-js

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
            return DATA.User[args.id];
          }
        }
      }
    })
  });

  it('Should just work.', (done) => {

    graphql(schema, query).then((result) => {
      if (result.errors) {
        console.error(result.errors);
        fail();
      } else {
        expect(result.data.user.name).to.equal(DATA.User.test.name);
        done();
      }
    });
  });
});

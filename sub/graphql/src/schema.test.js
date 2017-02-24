//
// Copyright 2016 Minder Labs.
//

const expect = require('chai').expect;

import {
  graphql,
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';

import { makeExecutableSchema, mockServer } from 'graphql-tools';
import { introspectionQuery, printSchema } from 'graphql/utilities';

import { IdGenerator, Matcher, MemoryItemStore } from 'minder-core';

import { Database } from './db/database';
import { Resolvers } from './resolvers';

import Schema from './gql/schema.graphql';


//
// 3 Tests (Native GraphQL API + 2 Apollo graphql-tools).
//

const query = `
  query TestQuery { 
    viewer {
      user {
        id
        title
      }
    }
  }
`;

const test = (result, expected) => {
  return new Promise((resolve, reject) => {
    console.assert(result);
    if (result.errors) {
      console.error(result.errors);
      reject();
    } else {
      expect(result.data).to.eql(expected);
      resolve();
    }
  });
};

const idGenerator = new IdGenerator(1000);

const matcher = new Matcher();

function createDatabase() {
  return new Database(idGenerator, matcher)
    .registerItemStore(new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.SYSTEM))
    .registerItemStore(new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.USER));
}

//
// Debugging
// - Install PyCharm chrome extension.
// - Create Debug configuration.
// - Reload Chrome tab to re-run tests (temperamental).
//


//
// Mock server.
// https://github.com/apollostack/graphql-tools
//

describe('GraphQL Mock Server:', () => {
  let context = { userId: 'minder' };

  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html
  let resolverMap = {
    RootQuery: () => ({
      viewer: (root, args) => {
        let { userId:id } = context;

        return {
          user: {
            id,
            type: 'User',
            title: 'Minder'
          }
        }
      }
    })
  };

  // http://graphql.org/blog/mocking-with-graphql
  let server = mockServer(Schema, resolverMap);

  it('Query viewer', (done) => {
    server.query(query).then(result => test(result, {
      viewer: {
        user: {
          id: 'minder',
          title: 'Minder'
        }
      }
    }).then(done));
  });
});

//
// Executable schema (using database).
// https://github.com/graphql/graphql-js
// https://github.com/apollostack/frontpage-server/blob/master/data/schema.js
//

describe('GraphQL Executable Schema:', () => {
  let context = { userId: 'minder' };

  let database = createDatabase();
  database.upsertItems(context, [{ id: 'minder', type: 'User', title: 'Minder' }], Database.NAMESPACE.SYSTEM);

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html
  let schema = makeExecutableSchema({
    typeDefs: Resolvers.typeDefs,
    resolvers: Resolvers.getResolvers(database),
    logger: {
      log: (error) => console.log('Schema Error', error)
    }
  });

  it('Query viewer', (done) => {
    database.getItem(context, 'User', 'minder', Database.NAMESPACE.SYSTEM).then(item => {
      expect(item.id).to.equal('minder');

      // https://github.com/graphql/graphql-js/blob/master/src/graphql.js
      graphql(schema, query, null, context).then(result => test(result, {
        viewer: {
          user: {
            id: 'minder',
            title: 'Minder'
          }
        }
      }).then(done));
    });
  });
});

//
// Native GraphQL API.
// https://github.com/graphql/graphql-js
//

describe('GraphQL JS API:', () => {
  let context = { userId: 'minder' };

  let database = createDatabase();
  database.upsertItems(context, [{ id: 'minder', type: 'User', title: 'Minder' }], Database.NAMESPACE.SYSTEM);

  let schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: {
        viewer: {
          type: new GraphQLObjectType({
            name: 'Viewer',
            fields: {
              user: {
                type: new GraphQLObjectType({
                  name: 'User',
                  fields: {
                    id: {
                      type: new GraphQLNonNull(GraphQLID)
                    },
                    title: {
                      type: new GraphQLNonNull(GraphQLString)
                    }
                  }
                })
              }
            },
          }),

          resolve(root, args, context, info) {
            let { userId } = context;
            return database.getItem(context, 'User', userId, Database.NAMESPACE.SYSTEM).then(user => {
              return {
                user
              }
            });
          }
        }
      }
    })
  });

  if (false) {
    it('Generate JSON', (done) => {
      graphql(schema, introspectionQuery).then((result) => {
        console.log('SCHEMA:\n', JSON.stringify(result, 0, 2));
        done();
      })
    });
  }

  it('Query viewer', (done) => {
    // https://github.com/graphql/graphql-js/blob/master/src/graphql.js
    graphql(schema, query, null, context).then((result) => test(result, {
      viewer: {
        user: {
          id: 'minder',
          title: 'Minder'
        }
      }
    })).then(done);
  });
});

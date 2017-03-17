//
// Copyright 2016 Minder Labs.
//

import { expect } from 'chai';

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

import { Database, IdGenerator, Matcher, MemoryItemStore } from 'minder-core';

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
  return new Database()
    .registerItemStore(new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.SYSTEM, false));
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

if (false)
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

if (false)
describe('GraphQL Executable Schema:', () => {
  let context = { userId: 'minder' };

  let database = createDatabase();

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html
  let schema = makeExecutableSchema({
    typeDefs: Resolvers.typeDefs,
    resolvers: Resolvers.getResolvers(database),
    logger: {
      log: error => console.log('Schema Error', error)
    }
  });

  database.getItemStore(Database.NAMESPACE.SYSTEM)
    .upsertItems(context, [
      { id: 'minder', type: 'User', title: 'Minder' }
    ])
    .then(() => {
      it('Query viewer', (done) => {
        database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', 'minder').then(item => {
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
});

//
// Native GraphQL API.
// https://github.com/graphql/graphql-js
//

describe('GraphQL JS API:', () => {
  let context = { userId: 'minder' };

  let database = createDatabase();

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
            return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'User', userId).then(user => {
              return {
                user
              }
            });
          }
        }
      }
    })
  });

  it('Generate JSON', (done) => {
    graphql(schema, introspectionQuery).then(result => {
//    console.log('SCHEMA:\n', JSON.stringify(result, 0, 2));
      done();
    })
  });

  database.getItemStore(Database.NAMESPACE.SYSTEM)
    .upsertItems(context, [{ id: 'minder', type: 'User', title: 'Minder' }])
    .then(() => {

      it('Query viewer', (done) => {
        // https://github.com/graphql/graphql-js/blob/master/src/graphql.js
        graphql(schema, query, null, context).then(result => test(result, {
          viewer: {
            user: {
              id: 'minder',
              title: 'Minder'
            }
          }
        })).then(done);
      });
    });
});

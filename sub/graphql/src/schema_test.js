//
// Copyright 2016 Minder Labs.
//

'use strict';

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

import { ID } from 'minder-core';

import { MemoryDatabase } from './db/memory_database';
import { Resolvers } from './resolvers';

import Schema from './schema.graphql';


// TODO(burdon): GraphiQL server testing?

//
// 3 Tests (Native GraphQL API + 2 Apollo graphql-tools).
//

const query = `
  query TestQuery() { 
    viewer {
      id
      user {
        id
        title
      }
    }
  }
`;

const test = (result, done) => {
  console.assert(result);
  if (result.errors) {
    console.error('### ERROR ###\n', result.errors);
    fail();
  } else {
    let { viewer } = result.data;
    console.log('viewer: %s', JSON.stringify(viewer));
    expect(viewer.id).to.equal('minder');
    expect(viewer.user.title).to.equal('Minder');
    done();
  }
};

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

  // TODO(burdon): Pass in context?

  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html
  let resolverMap = {
    RootQuery: () => ({
      viewer: (root, args, context) => {
        let user = { context };
        let userId = { user };
        console.assert(userId);

        return {
          id: userId,
          user: {
            id: userId,
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
    server.query(query).then((result) => {
      test(result, done);
    });
  });
});

//
// Executable schema (using database).
// https://github.com/graphql/graphql-js
// https://github.com/apollostack/frontpage-server/blob/master/data/schema.js
//

describe('GraphQL Executable Schema:', () => {
  let context = {};

  let database = new MemoryDatabase();
  database.upsertItems(context, [{ id: 'minder', type: 'User', title: 'Minder' }]);

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html
  let schema = makeExecutableSchema({
    typeDefs: Resolvers.typeDefs,
    resolvers: Resolvers.getResolvers(database),
    logger: {
      log: (error) => console.log('Schema Error', error)
    }
  });

  it('Query viewer', (done) => {
    let item = database.getItems(context, 'User', ['minder'])[0];
    expect(item.id).to.equal('minder');

    // https://github.com/graphql/graphql-js/blob/master/src/graphql.js
    graphql(schema, query).then((result) => {
      test(result, done);
    });
  });
});

//
// Native GraphQL API.
// https://github.com/graphql/graphql-js
//

describe('GraphQL JS API:', () => {
  let context = {};

  let database = new MemoryDatabase();
  database.upsertItems(context, [{ id: 'minder', type: 'User', title: 'Minder' }]);

  let schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: {
        viewer: {
          type: new GraphQLObjectType({
            name: 'Viewer',
            fields: {
              id: {
                type: new GraphQLNonNull(GraphQLID)
              },
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
          resolve(node, args, context) {
            let user = { context };
            let userId = { user };
            console.assert(userId);

            return {
              id: userId,

              // TODO(burdon): Don't get from database.
              user: database.getItems({}, type, [userId])[0]
            }
          }
        }
      }
    })
  });

  it('Generate JSON', (done) => {
    graphql(schema, introspectionQuery).then((result) => {
//    console.error('SCHEMA:\n', JSON.stringify(result, 0, 2));
      done();
    })
  });

  it('Query viewer', (done) => {
    // https://github.com/graphql/graphql-js/blob/master/src/graphql.js
    let vars = { userId: ID.toGlobalId('User', 'minder') };
    graphql(schema, query, {}, {}, vars).then((result) => {
      test(result, done);
    });
  });
});

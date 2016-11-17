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

import { ID } from 'minder-core';

import { Database } from './database';
import { SchemaFactory } from './schema';

import schema from './schema.graphql';


// TODO(burdon): GraphiQL server testing?

//
// 3 Tests (Native GraphQL API + 2 Apollo graphql-tools).
//

// TODO(burdon): Variables.
const query = `
  { 
    viewer(userId: "${ID.toGlobalId('User', 'minder')}") {
      id
      user {
        title
      }
    }
  }
`;

const test = (result, done) => {
  if (result.errors) {
    console.error('TEST FAILED', result.errors);
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
// Database.
// TODO(burdon): Move to database_test.js
//

describe('Database', () => {

  // TODO(burdon): console.assert doesn't work.

  let database = new Database();

  // TODO(burdon): Move test to core.
  it('Convert between glocal to local IDs', () => {
    let globalId = ID.toGlobalId('User', 'minder');
    let { type, id } = ID.fromGlobalId(globalId);
    expect(type).to.equal('User');
    expect(id).to.equal('minder');
  });

  it('Create and get items', () => {
    let items = database.upsertItems([{ type: 'User', title: 'Minder' }]);
    expect(items.length).to.equal(1);

    let item = database.getItem('User', items[0].id);
    expect(item.title).to.equal(items[0].title);
  });
});


//
// Mock server.
// https://github.com/apollostack/graphql-tools
//

describe('Test Mock Server', () => {

  let database = new Database();
  let resolvers = new SchemaFactory(database).getResolvers();

  database.upsertItems([{ id: 'minder', type: 'User', title: 'Minder' }]);

  // Convert to resolver map to functions.
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html
  let resolverMap = {};
  _.each(resolvers, (f, key) => {
    resolverMap[key] = () => f;
  });

  // http://graphql.org/blog/mocking-with-graphql
  let server = mockServer(schema, resolverMap);

  it('Query viewer', (done) => {
    let item = database.getItem('User', 'minder');
    expect(item.id).to.equal('minder');

    // TODO(burdon): Inject variables?
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

  let database = new Database();
  let resolvers = new SchemaFactory(database).getResolvers();

  database.upsertItems([{ id: 'minder', type: 'User', title: 'Minder' }]);

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#makeExecutableSchema
  let jsSchema = makeExecutableSchema({
    typeDefs: schema,
    resolvers: resolvers,
    logger: { log: (error) => console.error(error) }
  });

  it('Query viewer', (done) => {
    let item = database.getItem('User', 'minder');
    expect(item.id).to.equal('minder');

    graphql(jsSchema, query).then((result) => {
      test(result, done);
    });
  });
});

//
// Native GraphQL API.
// https://github.com/graphql/graphql-js
//

// TODO(burdon): Implement trivial top-level query only.

if (false)
describe('Test GraphQL API', () => {

  let database = new Database();
  let resolvers = new SchemaFactory(database).getResolvers();

  let schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        viewer: {
          type: new GraphQLObjectType({
            name: 'Viewer',
            fields: {
              id: {
                type: GraphQLID
              }
            }
          }),
          args: {
            id: {
              type: GraphQLID
            }
          },
          resolve: (parent, args) => {
            return null; // TODO(burdon): Database.
          }
        }
      }
    })
  });

  it('Query viewer', (done) => {
    graphql(schema, query).then((result) => {
      test(result, done);
    });
  });
});

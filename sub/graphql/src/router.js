//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';

import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';

import { Resolvers } from './resolvers';
import { graphqlLogger } from './util/logger';

/**
 * Express router for graphql server.
 * https://github.com/apollostack/graphql-server
 * https://github.com/graphql/express-graphql#options
 * http://dev.apollodata.com/tools/graphql-server/index.html
 *
 * @param database
 * @param options
 * @returns {*}
 */
export const graphqlRouter = (database, options) => {
  console.assert(database);

  options = _.defaults(options, { graphql: '/graphql', graphiql: '/graphiql' });

  const schema = makeExecutableSchema({
    typeDefs: Resolvers.typeDefs,
    resolvers: Resolvers.getResolvers(database),
    logger: {
      log: (error) => console.log('Schema Error', error)
    }
  });

  // https://expressjs.com/en/guide/routing.html
  const router = express.Router();

  // MIME type.
  router.use(bodyParser.json());                           // JSON post (GraphQL).
  router.use(bodyParser.urlencoded({ extended: true }));   // Encoded bodies (Form post).

  // Logging (must happen before graphql endpoint.
  if (options.logging) {
    router.use(options.graphql, graphqlLogger(options));
  }

  // Bind server.
  // https://github.com/graphql/express-graphql
  router.use(options.graphql, graphqlExpress({
    schema: schema,
    pretty: true,
    formatError: error => ({
      message: error.message,
      locations: error.locations,
      stack: error.stack
    })
  }));

  // Bind debug UX.
  router.use(options.graphiql, graphiqlExpress({
    endpointURL: options.graphql,
  }));

  return router;
};

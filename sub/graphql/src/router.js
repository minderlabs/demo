//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';
import express from 'express';
import cookieParser from 'cookie-parser';
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
 *  {
 *    {Function(request)} resolverContext
 *  }
 *
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

  let router = express.Router();

  // Coockies (e.g., OAuth).
  router.use(cookieParser());

  // JSON body.
  router.use(bodyParser.json());

  // Bind server.
  // https://github.com/graphql/express-graphql
  // http://dev.apollodata.com/tools/graphql-server/setup.html#graphqlOptions
  // http://dev.apollodata.com/tools/graphql-server/setup.html#options-function

  // TODO(burdon): Simulate errors?
  router.use(options.graphql, graphqlExpress(req => ({

    // Executable schema.
    schema: schema,

    // TODO(burdon): Cookies are blank.
    // client and auth have different routers and GET/POST but OK; so issue with graphqlExpress?

    // TODO(burdon): Client doesn't send cookies (set header instead).
    // https://github.com/apollostack/apollo-client/issues/132

    // Request context for resolvers (e.g., authenticated user).
    // http://dev.apollodata.com/tools/graphql-server/setup.html
    // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
    context: options.resolverContext && options.resolverContext(req) || {},

    pretty: true,

    formatError: error => ({
      message: error.message,
      locations: error.locations,
      stack: error.stack
    })
  })));

  // Bind debug UX.
  router.use(options.graphiql, graphiqlExpress({
    endpointURL: options.graphql,
  }));

  return router;
};

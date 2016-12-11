//
// Copyright 2016 Minder Labs.
//

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
 *  {
 *    {Function(request)} resolverContext
 *  }
 *
 * @returns {*}
 */
export const graphqlRouter = (database, options) => {
  console.assert(database);
  options = _.defaults(options, { graphql: '/graphql', graphiql: '/graphiql' });

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#makeExecutableSchema
  const schema = makeExecutableSchema({
    typeDefs: Resolvers.typeDefs,
    resolvers: Resolvers.getResolvers(database),
    logger: {
      log: (error) => console.log('Schema Error', error)
    }
  });

  let router = express.Router();

  // JSON body.
  router.use(bodyParser.json());

  // Logging.
  if (options.logging) {
    router.use(options.graphql, graphqlLogger(options));
  }

  // Bind server.
  // TODO(burdon): Simulate errors?
  // https://github.com/graphql/express-graphql
  // http://dev.apollodata.com/tools/graphql-server/setup.html#options-function
  router.use(options.graphql, graphqlExpress((request) => new Promise((resolve, reject) => {

    // http://dev.apollodata.com/tools/graphql-server/setup.html#graphqlOptions
    let graphqlOptions = {
      schema: schema,

      formatError: error => ({
        message: error.message,
        locations: error.locations,
        stack: error.stack
      })
    };

    // TODO(burdon): Provide root value?
    // TODO(burdon): Error handling.
    // Request context for resolvers (e.g., authenticated user).
    // http://dev.apollodata.com/tools/graphql-server/setup.html
    // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
    if (options.context) {
      options.context(request).then((context) => {
        console.assert(context);
        graphqlOptions.context = context;
        resolve(graphqlOptions);
      });
    } else {
      resolve(graphqlOptions);
    }
  })));

  // TODO(madadam): Figure out how to inject context here too, for authentication headers.
  // Bind debug UX.
  router.use(options.graphiql, graphiqlExpress({
    endpointURL: options.graphql,
  }));

  return router;
};

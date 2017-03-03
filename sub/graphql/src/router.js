//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';

import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';

import { Logger } from 'minder-core';

import { Resolvers } from './resolvers';
import { graphqlLogger } from './util/logger';

const logger = Logger.get('gql');

/**
 * Express router for graphql server.
 * https://github.com/apollostack/graphql-server
 * https://github.com/graphql/express-graphql#options
 * http://dev.apollodata.com/tools/graphql-server/index.html
 *
 * @param database
 * @param options
 * {
 *   {Function(request)} resolverContext
 * }
 *
 * @returns {Router}
 */
export const graphqlRouter = (database, options) => {
  console.assert(database);
  options = _.defaults(options, {
    graphql: '/graphql',
    graphiql: '/graphiql'
  });

  // http://dev.apollodata.com/tools/graphql-tools/generate-schema.html#makeExecutableSchema
  const schema = makeExecutableSchema({

    // Schema defs.
    typeDefs: Resolvers.typeDefs,

    // Resolvers.
    resolvers: Resolvers.getResolvers(database),

    // Log resolver errors.
    logger: {
      log: (error) => {
        logger.error('GraphQL Error: ' + (error.originalMessage || error.message))
      }
    }
  });

  let router = express.Router();

  // JSON body.
  router.use(bodyParser.json());

  // Add logging to path (must go first).
  if (options.logging) {
   router.use(options.graphql, graphqlLogger(options));
  }

  //
  // Bind server with async options.
  // https://github.com/graphql/express-graphql
  // http://dev.apollodata.com/tools/graphql-server/setup.html#options-function
  //
  router.use(options.graphql, graphqlExpress(request => {

    // http://dev.apollodata.com/tools/graphql-server/setup.html#graphqlOptions
    let graphqlOptions = {

      // http://dev.apollodata.com/tools/graphql-tools/errors.html#forbidUndefinedInResolve
      schema,

      // function used to format errors before returning them to clients.
      // TODO(burdon): https://www.npmjs.com/package/graphql-apollo-errors
      formatError: (error) => {

        // NOTE: Don't leak server errors to client.
        // TODO(burdon): How to send 401/500 error to client.
        return error.message;
      },

      // Don't dump resolver exceptions (caught by logger above).
      debug: false
    };

    // Provide the request context for resolvers (e.g., authenticated user).
    // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
    if (options.contextProvider) {
      return options.contextProvider(request)
        .then(context => {
          console.assert(context);
          return _.defaults(graphqlOptions, {
            context
          })
        })
        .catch(error => {
          logger.error(error);
          return graphqlOptions;
        });
    } else {
      return Promise.resolve(graphqlOptions);
    }
  }));

  // http://dev.apollodata.com/tools/graphql-server/graphiql.html
  // TODO(madadam): Figure out how to inject context here too, for authentication headers.
  // https://github.com/graphql/graphiql/blob/master/example/index.html
  // Bind debug UX.
  if (options.graphiql) {
    router.use(options.graphiql, graphiqlExpress({
      endpointURL: options.graphql,
    }));
  }

  return router;
};

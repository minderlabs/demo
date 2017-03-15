//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';

import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { GraphQLError, BREAK } from 'graphql';

import { ErrorUtil, Logger } from 'minder-core';

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
 *   contextProvider: {Function(request)}
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

    // Log resolver errors (formatError returns message to client).
    // https://github.com/graphql/graphql-js/pull/402
    logger: {
      log: (error) => {
        logger.error('GraphQL Error: ' + error);
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
  //
  // NOTE: graphqlExpress is part of Apollo's graphql-server-express implementation:
  // http://dev.apollodata.com/tools/graphql-server/setup.html#options-function
  // Which is subtlely different from the graphql implementation:
  // https://github.com/graphql/express-graphql
  //
  router.use(options.graphql, graphqlExpress(request => {
    const startTime = Date.now();

    //
    // http://dev.apollodata.com/tools/graphql-server/setup.html#graphqlOptions
    //
    // TODO(burdon): Move to const.
    let graphqlOptions = {

      // TODO(burdon): Enforce.
      // http://dev.apollodata.com/tools/graphql-tools/errors.html#forbidUndefinedInResolve
//    forbidUndefinedInResolve(schema),
      schema,

      // Value accessible by resolvers.
      rootValue: {},

      // function used to format errors before returning them to clients.
      // TODO(burdon): https://www.npmjs.com/package/graphql-apollo-errors
      formatError: (error) => {

        // NOTE: Don't leak server errors to client.
        // https://github.com/graphql/express-graphql#debugging-tips
        // TODO(burdon): How to send 401/500 error to client? formatResponse?
        return {
          message: 'GraphQL Server Error: ' + ErrorUtil.message(error)
        };
      },

      // TODO(burdon): Use "extensions" option to add debug key x value metadata to the response.
      extensions({ document, variables, operationName, result }) {
        return {
          runTime: Date.now() - startTime
        };
      },

      // NOTE: Advanced query validation? (not resolver context).
      // http://graphql.org/graphql-js/validation
      // http://graphql.org/graphql-js/language
      // validationRules: [
      //   // ValidationContext
      //   (context) => {
      //     return {
      //       enter() {
      //         // https://github.com/apollographql/graphql-server/blob/f69c2eea84de0516128f6f4dcfb2102b5414521a/packages/graphql-server-integration-testsuite/src/index.ts
      //         context.reportError(new GraphQLError('Validation error.'));
      //         return BREAK;
      //       }
      //     }
      //   }
      // ],

      // Don't dump resolver exceptions (caught by logger above).
      debug: false
    };

    //
    // Provide the request context for resolvers (e.g., authenticated user).
    // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-function-signature
    //
    if (options.contextProvider) {
      return options.contextProvider(request).then(context => {
        console.assert(context);
        return _.defaults(graphqlOptions, { context });
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

//
// Copyright 2016 Minder Labs.
//

import express from 'express';
import morgan from 'morgan';

/**
 * Production logging.
 *
 * https://github.com/bithavoc/express-winston/blob/master/Readme.md
 * https://www.npmjs.com/package/express-logging (see also)
 * https://www.loggly.com/ultimate-guide/node-logging-basics
 * http://tostring.it/2014/06/23/advanced-logging-with-nodejs
 *
 * app.use('/', loggingRouter());
 *
 * @returns {*}
 */
export const loggingRouter = (options) => {
  let router = express.Router();

  router.use(morgan(':status :method :url'));

  /*
  morgan.token('graphql-query', (req) => {
    const {query, variables, operationName} = req.body;
    return `[${operationName}]\n${query}\nvariables: ${JSON.stringify(variables)}`;
  });

  router.use(morgan(':graphql-query', {skip: (req, res) => req.originalUrl !== '/graphql'}));
  */

  /*
  router.use(expressWinston.logger({
    transports: [
      new winston.transports.Console({
        json: true,
        colorize: true
      })
    ],
    meta: false,
    expressFormat: false,
    colorize: true,
    msg: "### winston {{req.method}} {{req.url}}", // Can be JS.
//  ignoreRoute: function (req, res) { return false; }
  }));
  */

  return router;
};

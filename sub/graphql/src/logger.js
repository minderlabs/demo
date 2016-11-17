//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';
import express from 'express';
import moment from 'moment';
import morgan from 'morgan';

import { TypeUtil } from 'minder-core';

const TS = 'hh:mm:ss.SSS';

const LEN = 80;
const HEADER = _.repeat('#', LEN - TS.length - 17);
const FOOTER = _.repeat('#', LEN);
const PRETTY_REQ = '\n### [REQ] ' + HEADER + ' [%s] ###\n%s\nvariables = %s\n' + FOOTER + '\n';
const PRETTY_RES = '\n### [RES] ' + HEADER + ' [%s] ###\n%s\n' + FOOTER + '\n';

/**
 * Debug logging middleware for graphqlExpress request/responses.
 *
 * @param options
 */
export const graphqlLogger = (options={ logging: true, pretty: true }) => {
  return (req, res, next) => {
    if (options.logging) {
      let stringify = options.pretty ?
        (json) => JSON.stringify(json, 0, 2) :
        (json) => JSON.stringify(json, TypeUtil.JSON_REPLACER, 0);

      let { operationName, query, variables } = req.body;

      if (options.pretty) {
        console.log(PRETTY_REQ, moment().format(TS), query, stringify(variables));
      } else {
        query = query.replace(/\s*\n\s*/g, ' ');
        console.log('### REQ ### %s %s', query, stringify(variables));
      }

      // Monkey patch.
      // https://github.com/axiomzen/express-interceptor/blob/master/index.js
      // http://stackoverflow.com/questions/19215042/express-logging-response-body
      let originalWrite = res.write;
      res.write = (data) => {
        switch (res.statusCode) {
          case 200:
            if (options.pretty) {
              console.log(PRETTY_RES, moment().format(TS), stringify(JSON.parse(data)));
            } else {
              console.log('### RES ### %s', data);
            }
            break;

          default:
            console.error(data);
        }

        return originalWrite.call(res, data);
      };
    }

    next();
  }
};

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

  // https://expressjs.com/en/guide/routing.html
  const router = express.Router();

  router.use(morgan(':date[iso] [:status] :method :url'));

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

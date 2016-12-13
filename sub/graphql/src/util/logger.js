//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { $$, Logger, TypeUtil } from 'minder-core';

const TS = 'hh:mm:ss.SSS';

const LEN = 80;
const HEADER = _.repeat('#', LEN - TS.length - 17);
const FOOTER = _.repeat('#', LEN);
const PRETTY_REQ = '\n### [REQ] ' + HEADER + ' [%s] ###\n%s\nvariables = %s\n' + FOOTER + '\n';
const PRETTY_RES = '\n### [RES] ' + HEADER + ' [%s] ###\n%s\n' + FOOTER + '\n';

const logger = Logger.get('gql', false);

/**
 * Debug logging middleware for graphqlExpress request/responses.
 *
 * @param options
 */
export const graphqlLogger = (options={ pretty: false }) => {
  return (req, res, next) => {
    let stringify = options.pretty ?
      (json) => JSON.stringify(json, 0, 2) :
      (json) => TypeUtil.stringify(json, 0);

    let { operationName, query, variables } = req.body;

    if (options.pretty) {
      logger.log($$(PRETTY_REQ, moment().format(TS), query, stringify(variables)));
    } else {
      query = query.replace(/\s*\n\s*/g, ' ');
      logger.log($$('### REQ ### %s %s', query, stringify(variables || {})));
    }

    // Monkey patch.
    // https://github.com/axiomzen/express-interceptor/blob/master/index.js
    // http://stackoverflow.com/questions/19215042/express-logging-response-body
    let originalWrite = res.write;
    res.write = (data) => {
      // TODO(burdon): Not efficient intercepting write.
      let json = JSON.parse(data);
      switch (res.statusCode) {
        case 200: {
          if (options.pretty) {
            logger.log($$(PRETTY_RES, moment().format(TS), stringify(json)));
          } else {
            logger.log($$('### RES ### %s', stringify(json)));
          }

          break;
        }

        default: {
          // TODO(burdon): Get error?
          logger.error(`### ERR[${res.statusCode}] ###`);
          _.each(json.errors, (err) => {
            logger.log(`> ${err.message}`);
          });
        }
      }

      return originalWrite.call(res, data);
    };

    next();
  }
};

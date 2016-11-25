//
// Copyright 2016 Minder Labs.
//

'use strict';

import moment from 'moment';

import { createNetworkInterface } from 'apollo-client';

import { TypeUtil } from 'minder-core';

/**
 * Wrapper for network.
 */
export class NetworkManager {

  // TODO(burdon): Event emitter.

  static REQUEST_ID_HEADER = 'x-req-id';

  constructor(config, eventListener) {

    // TODO(burdon): Emit send/recv events.
    this._eventListener = eventListener;

    this._requestCount = 0;
    this._requestMap = new Map();

    // TODO(burdon): Configure via options.
    this._logger = new Logger();

    // TODO(burdon): Configure batching via options.
    // https://github.com/apollostack/core-docs/blob/master/source/network.md#query-batching

    // Create the interface.
    this._networkInterface = createNetworkInterface({
      uri: config.graphql
    });

    /**
     * Intercept request.
     * http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
     */
    this._networkInterface.use([{
      applyMiddleware: ({ request, options }, next) => {

        // Track request ID.
        // https://github.com/apollostack/apollo-client/issues/657
        const requestId = `${request.operationName}:${++this._requestCount}`;
        if (!options.headers) {
          options.headers = {};
        }
        options.headers[Logger.REQUEST_ID_HEADER] = requestId;
        this._requestMap.set(requestId, request);

        // TODO(burdon): Paging bug when non-null text filter.
        // https://github.com/apollostack/apollo-client/issues/897
        // "There can only be one fragment named ItemFragment" (from server).
        let definitions = {};
        request.query.definitions = _.filter(request.query.definitions, (definition) => {
          let name = definition.name.value;
          if (definitions[name]) {
            console.warn('SKIPPING: %s', name);
            return false;
          } else {
            definitions[name] = true;
            return true;
          }
        });

        this._logger.logRequest(requestId, request);

        next();
      }
    }]);

    /**
     * Intercept response.
     * http://dev.apollodata.com/core/network.html#networkInterfaceAfterware
     * https://github.com/apollostack/apollo-client/issues/657
     */
    this._networkInterface.useAfter([{
      applyAfterware: ({ response, options }, next) => {

        // Match request.
        const requestId = options.headers[Logger.REQUEST_ID_HEADER];
        this._requestMap.delete(requestId);

        // https://github.com/apollostack/core-docs/issues/224
        // https://developer.mozilla.org/en-US/docs/Web/API/Response/clone
        if (response.ok) {
          response.clone().json().then((response) => {
            if (response.errors) {
              // TODO(burdon): Emit error.
              this._logger.logError(response.errors);
            } else {
              this._logger.logResponse(requestId, response);
            }

            next();
          });
        } else {
          response.clone().text().then(bodyText => {
            // TODO(burdon): Use logger.
            // TODO(burdon): Emit error.
            console.error(`Network Error [ ${response.status}]: (${response.statusText}) (${bodyText})`);

            next();
          });
        }
      }
    }]);
  }

  get networkInterface() {
    return this._networkInterface;
  }
}

/**
 * Client request logger.
 * http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
 */
class Logger {

  static TIMESTAMP = 'hh:mm:ss.SSS';

  // TODO(burdon): Verbose option.
  constructor(options) {}

  logRequest(requestId, request) {
    console.log('[%s] >>> [%s]: %s', moment().format(Logger.TIMESTAMP),
      requestId, JSON.stringify(request.variables, TypeUtil.JSON_REPLACER));
  }

  logResponse(requestId, response) {
    console.log('[%s] <<< [%s]', moment().format(Logger.TIMESTAMP),
      requestId, JSON.stringify(response.data, TypeUtil.JSON_REPLACER));
  }

  logError(requestId, errors) {
    console.error('GraphQL Error [%s]:',
      requestId, errors.map(error => error.message));
  }
}

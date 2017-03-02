//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import { print } from 'graphql-tag/printer';
import { createNetworkInterface } from 'apollo-client';

import { HttpUtil, TypeUtil, Wrapper } from 'minder-core';

import { AuthManager } from './auth';

const logger = Logger.get('net');

/**
 * Wrapper for the Apollo network interface.
 */
export class NetworkManager {

  // NOTE: must be lowercase.
  static HEADER_REQUEST_ID  = 'minder-request-id';

  /**
   *
   * @param {object }config
   * @param {AuthManager} authManager
   * @param {EventHandler} eventHandler
   */
  constructor(config, authManager, eventHandler) {
    console.assert(config && authManager && eventHandler);
    this._config = config;
    this._authManager = authManager;
    this._eventHandler = eventHandler;

    // Log and match request/reponses.
    this._requestCount = 0;
    this._requestMap = new Map();

    // Set on initialization.
    this._logger = null;
    this._networkInterface = null;
  }

  /**
   * Initializes the network manager.
   * May be called multiple times -- e.g., after config has changed.
   * @returns {NetworkManager}
   */
  init() {
    // Reset stats.
    this._requestCount = 0;
    this._requestMap.clear();

    // Logging.
    this._logger = new NetworkLogger(this._config);

    // Create the interface.
    // http://dev.apollodata.com/core/network.html
    // http://dev.apollodata.com/core/apollo-client-api.html#createNetworkInterface
    this._networkInterface = createNetworkInterface({
      uri: this._config.graphql
    });

    // TODO(burdon): Configure batching via options.
    // https://github.com/apollostack/core-docs/blob/master/source/network.md#query-batching

    // TODO(burdon): Currently catching network errors as unhandled promises (see main.js)
    // https://github.com/apollostack/apollo-client/issues/657 [Added comment]
    // https://github.com/apollostack/apollo-client/issues/891
    // https://github.com/apollostack/apollo-client/pull/950
    // https://github.com/apollostack/react-apollo/issues/345

    /**
     * Add headers for execution context (e.g., JWT Authentication header).
     */
    const addHeaders = {
      applyMiddleware: ({ request, options }, next) => {

        // Asynchronously add the JWT.
        this._authManager.getToken().then(token => {
          options.headers = _.assign(options.headers, AuthManager.getHeaders(token));
          next();
        });
      }
    };

    /**
     * TODO(burdon): Paging bug when non-null text filter.
     * https://github.com/apollostack/apollo-client/issues/897
     * https://github.com/apollographql/apollo-client/pull/906
     * https://github.com/apollographql/apollo-client/pull/913
     * "There can only be one fragment named ItemFragment" (from server).
     */
    const fixFetchMoreBug = {
      applyMiddleware: ({ request, options }, next) => {

        // Remove duplicate fragment.
        let definitions = {};
        request.query.definitions = _.filter(request.query.definitions, (definition) => {
          let name = definition.name.value;
          if (definitions[name]) {
            logger.warn('SKIPPING: %s', name);
            return false;
          } else {
            definitions[name] = true;
            return true;
          }
        });

        next();
      }
    };

    /**
     * Intercept request.
     * http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
     */
    const logRequest = {
      applyMiddleware: ({ request, options }, next) => {

        // Track request ID.
        // https://github.com/apollostack/apollo-client/issues/657
        const requestId = `${request.operationName}-${++this._requestCount}`;
        this._requestMap.set(requestId, request);

        // Add header to track response.
        options.headers = _.assign(options.headers, {
          [NetworkManager.HEADER_REQUEST_ID]: requestId
        });

        this._logger.logRequest(requestId, request);
        this._eventHandler.emit({ type: 'network.out' });
        next();
      }
    };

    /**
     * Intercept response.
     * http://dev.apollodata.com/core/network.html#networkInterfaceAfterware
     * https://github.com/apollostack/apollo-client/issues/657
     */
    const logResponse = {
      applyAfterware: ({ response, options }, next) => {

        // Match request.
        const requestId = options.headers[NetworkManager.HEADER_REQUEST_ID];
        let removed = this._requestMap.delete(requestId);
        console.assert(removed, 'Request not found: %s', requestId);

        if (response.ok) {

          // Clone the result to access body.
          // https://github.com/apollostack/core-docs/issues/224
          // https://developer.mozilla.org/en-US/docs/Web/API/Response/clone
          response.clone().json()
            .then(response => {

              // Check GraphQL error.
              if (response.errors) {
                // GraphQL Error.
                this._logger.logErrors(requestId, response.errors);
                this._eventHandler.emit({
                  type: 'error',
                  message: NetworkLogger.stringify(response.errors)
                });
              } else {
                this._logger.logResponse(requestId, response);
              }
            });
        } else {
          // GraphQL Network Error.
          response.clone().text().then(text => {
            this._logger.logErrors(requestId, response.errors);
            this._eventHandler.emit({
              type: 'error',
              message: NetworkLogger.stringify(response.errors)
            });
          });
        }

        next();
      }
    };

    //
    // http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
    //
    this._networkInterface
      .use([
        addHeaders,
        fixFetchMoreBug,
        logRequest
      ])
      .useAfter([
        logResponse
      ]);

    return this;
  }

  /**
   * Exposes the interface for the Apollo client.
   * @returns {*}
   */
  get networkInterface() {
    return this._networkInterface;
  }
}

/**
 * Client request logger.
 * http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
 */
class NetworkLogger {

  static stringify(errors) {
    return errors.map(error => error.message).join(' | ');
  }

  /**
   * @param {Wrapper} options
   */
  constructor(options) {
    console.assert(options);
    this._options = options;
  }

  logRequest(requestId, request) {
    logger.log($$('[_TS_] ===>>> [%s] %o', requestId, request.variables || {}));

    // Show GiQL link.
    if (_.get(this._options, 'debug', true)) {
      let url = HttpUtil.absoluteUrl(_.get(this._options, 'graphiql', '/graphiql'));
      logger.info('[' + TypeUtil.pad(requestId, 24) + ']: ' + url + '?' + HttpUtil.toUrlArgs({
        query: print(request.query),
        variables: JSON.stringify(request.variables)
      }));
    }
  }

  logResponse(requestId, response) {
    logger.log($$('[_TS_] <<<=== [%s] %o', requestId, response.data));
  }

  logErrors(requestId, errors) {
    logger.error($$('GraphQL Error [%s]: %s', requestId, NetworkLogger.stringify(errors)));
  }
}

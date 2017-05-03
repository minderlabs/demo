//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import { print } from 'graphql/language/printer';
import { createNetworkInterface } from 'apollo-client';

import { AuthUtil, UpsertItemsMutationName, ItemStore, HttpUtil, TypeUtil, Wrapper } from 'minder-core';

import { Const } from '../../common/defs';

import { AuthManager } from './auth';
import { ConnectionManager } from './client';

const logger = Logger.get('net');

/**
 * Wrapper for the Apollo network interface.
 */
export class NetworkManager {

  /**
   * Manages teh Apollo network interface.
   *
   * @param {object }config
   * @param {AuthManager} authManager
   * @param {ConnectionManager} connectionManager
   * @param {EventHandler} eventHandler
   */
  constructor(config, authManager, connectionManager, eventHandler) {
    console.assert(config && authManager && connectionManager && eventHandler);
    this._config = config;
    this._authManager = authManager;
    this._connectionManager = connectionManager;
    this._eventHandler = eventHandler;

    // Log and match request/reponses.
    this._requestCount = 0;
    this._requestMap = new Map();

    // Set on initialization.
    this._logger = null;
    this._networkInterface = null;

    this._debug = this._config.debug
  }

  /**
   * Initializes the network manager.
   * May be called multiple times -- e.g., after config has changed.
   * @param {ItemStore} localItemStore
   * @returns {NetworkManager}
   */
  init(localItemStore=undefined) {

    // Reset stats.
    this._requestCount = 0;
    this._requestMap.clear();

    // Logging.
    this._logger = new NetworkLogger(this._config);

    /**
     * Add headers for request context (e.g., (JWT) id_token Authentication header).
     */
    const addHeaders = {
      applyMiddleware: ({ request, options }, next) => {

        // Auth.
        options.headers = AuthUtil.setAuthHeader(options.headers, this._authManager.idToken);

        // Client.
        options.headers = ConnectionManager.setClientHeader(options.headers, this._connectionManager.clientId);

        next();
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

        // Map of definitions by name.
        let definitions = {};

        // Remove duplicate fragment.
        request.query.definitions = _.filter(request.query.definitions, definition => {
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
     * Debugging network delay.
     */
    const delayRequest = () => ({
      applyMiddleware: ({ request, options }, next) => {
        let delay = _.get(this._config, 'options.networkDelay');
        if (delay) {
          setTimeout(() => {
            next();
          }, delay);
        } else {
          next();
        }
      }
    });

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
          [Const.HEADER.REQUEST_ID]: requestId
        });

        this._logger.logRequest(requestId, request, options.headers);
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

        // Clone the result to access body.
        // https://github.com/apollostack/core-docs/issues/224
        // https://developer.mozilla.org/en-US/docs/Web/API/Response/clone
        let clonedResponse = response.clone();

        // Match request.
        const requestId = options.headers[Const.HEADER.REQUEST_ID];
        let removed = this._requestMap.delete(requestId);
        console.assert(removed, 'Request not found: %s', requestId);

        // Error handler.
        const onError = errors => {
          this._logger.logErrors(requestId, errors);
          this._eventHandler.emit({
            type: 'error',
            message: NetworkLogger.stringify(errors)
          });
        };

        if (clonedResponse.ok) {
          clonedResponse.json().then(payload => {
            if (payload.errors) {
              onError(payload.errors);
            } else {
              this._logger.logResponse(requestId, payload);
            }
          });
        } else {
          // GraphQL Network Error (i.e., non-200 response).
          clonedResponse.json().then(payload => {
            onError(payload.errors);
          }).catch(() => {
            // Serious server error returns non JSON response.
            clonedResponse.text().then(text => {
              onError([{
                message: text
              }]);
            });
          });
        }

        next();
      }
    };

    //
    // Create the interface (and middleware).
    // http://dev.apollodata.com/core/network.html
    // http://dev.apollodata.com/core/apollo-client-api.html#createNetworkInterface
    // http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
    // https://github.com/apollographql/apollo-client/blob/master/src/transport/networkInterface.ts
    //

    // TODO(burdon): Configure batching via options.
    // https://github.com/apollostack/core-docs/blob/master/source/network.md#query-batching

    // TODO(burdon): Testing (mockNetworkInterface).
    // https://github.com/apollographql/apollo-client/blob/a86acf25df5eaf0fdaab264fd16c2ed22657e65c/test/customResolvers.ts

    let middleware = [
      addHeaders,
      fixFetchMoreBug,
      logRequest
    ];

    let afterware = [
      logResponse
    ];

    // Debugging delay.
    if (this._debug) {
      middleware.push(delayRequest());
    }

    // Create HTTPFetchNetworkInterface
    let networkInterface = createNetworkInterface({ uri: this._config.graphql })
      .use(middleware)
      .useAfter(afterware);

    if (localItemStore) {
      this._networkInterface = CachingNetworkInterface.createNetworkInterface(localItemStore, networkInterface);
    } else {
      this._networkInterface = networkInterface;
    }

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

  /**
   * Server can return array of errors.
   * See graphqlRouter's formatError option.
   *
   * @param errors
   * @return {string}
   */
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

  // TODO(burdon): printRequest
  // https://github.com/apollographql/apollo-client/blob/master/src/transport/networkInterface.ts

  logRequest(requestId, request, headers) {
    logger.log($$('[_TS_] ===>>> [%s] %o', requestId, request.variables || {}));

    //
    // Show GraphiQL link.
    //
    if (_.get(this._options, 'debug', true) || true) {  // TODO(burdon): Config detail.
      let url = HttpUtil.absoluteUrl(_.get(this._options, 'graphiql', '/graphiql'));
      logger.info('[' + TypeUtil.pad(requestId, 24) + ']: ' + url + '?' + HttpUtil.toUrlArgs({
        clientId:   headers[Const.HEADER.CLIENT_ID],
        query:      print(request.query),
        variables:  JSON.stringify(request.variables)
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

/**
 * Implements the Apollo NetworkInterface to proxy requests to the background page.
 *
 * http://dev.apollodata.com/core/network.html#custom-network-interface
 */
export class ChromeNetworkInterface { // extends NetworkInterface {

  // TODO(burdon): Move to minder-core.

  static CHANNEL = 'apollo';

  /**
   * Creates the network interface with the given Chrome channel (to the BG page).
   *
   * @param channel
   * @param eventHandler
   */
  constructor(channel, eventHandler=undefined) {
    console.assert(channel);
    this._channel = channel;
    this._eventHandler = eventHandler;
  }

  /**
   * Proxy request through the message sender.
   *
   * @param {GraphQLRequest} gqlRequest
   * @return {Promise<GraphQLResult>}
   */
  query(gqlRequest) {
    this._eventHandler && this._eventHandler.emit({ type: 'network.out' });
    return this._channel.postMessage(gqlRequest, true).then(gqlResponse => {
      this._eventHandler && this._eventHandler.emit({ type: 'network.in' });
      return gqlResponse;
    });
  }
}

/**
 * Implements caching layer for NetworkInterface.
 */
export class CachingNetworkInterface { // extends NetworkInterface {

  // TODO(burdon): Currently just intercepts local namespace. Should join results from server for other NS.

  // TODO(burdon): Extend NetworkInterface.
  // https://github.com/apollographql/apollo-client/issues/1403
  // https://github.com/apollographql/apollo-client/blob/master/src/transport/networkInterface.ts

  /**
   * Monkey patch existing interface.
   * @param itemStore
   * @param networkInterface
   * @returns {*}
   */
  static createNetworkInterface(itemStore, networkInterface) {
    console.assert(itemStore && networkInterface);

    let originalQuery = networkInterface.query.bind(networkInterface);

    // ExecutionResult { data, errors }
    // https://github.com/graphql/graphql-js/blob/master/src/execution/execute.js
    networkInterface.query = (request) => {
      let { operationName, query, variables={} } = request;

      switch (operationName) {

        // TODO(burdon): Determine namespace from item when creating mutator.

        // Mutations.
        case UpsertItemsMutationName: {
          let { namespace, mutations } = variables;
          if (namespace === itemStore.namespace) {
            logger.info('Local mutations: ' + TypeUtil.stringify(mutations));
            return ItemStore.applyMutations(itemStore, {}, mutations).then(items => ({
              data: {
                items: items
              }
            }));
          }
          break;
        }

        // Queries.
        // TODO(burdon): Plugin or generalize queries (like mutations).
        default: {
          let { filter } = variables;
          if (filter) {
            let { namespace } = filter;
            if (namespace === itemStore.namespace) {
              logger.info('Local query: ' + TypeUtil.stringify(filter));
              return itemStore.queryItems({}, {}, filter).then(items => ({
                data: {
                  search: items
                }
              }));
            }
          }
          break;
        }
      }

      return originalQuery(request);
    };

    return networkInterface;
  }
}

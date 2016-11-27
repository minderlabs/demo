//
// Copyright 2016 Minder Labs.
//

'use strict';

import moment from 'moment';
import io from 'socket.io-client';

import { createNetworkInterface } from 'apollo-client';

import { TypeUtil } from 'minder-core';

/**
 * Manages client connection.
 */
export class ConnectionManager {

  //
  // Register client and connect socket.
  // http://api.jquery.com/jquery.ajax
  //
  // https://www.npmjs.com/package/socket.io-client
  // http://socket.io/get-started/chat
  // http://socket.io/docs
  //

  // TODO(burdon): Injector.
  constructor(queryRegistry, eventHandler) {
    console.assert(queryRegistry && eventHandler);

    this._queryRegistry = queryRegistry;
    this._eventHandler = eventHandler;
    this._socket = io();
  }

  // TODO(burdon): Implement auto-reconnect.

  /**
   * Async connect
   * @returns {ConnectionManager}
   */
  connect() {
    return new Promise((resolve, reject) => {
      this._socket.on('connect', () => {
        let socketId = this._socket.io.engine.id;
        console.assert(socketId);

        // TODO(burdon): Factor out (nx-lite utils).
        let url = $('<a href="/client/register">')[0].href;

        // http://api.jquery.com/jquery.ajax
        $.ajax({
          url: url,
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          data: JSON.stringify({
            clientId: config.clientId,
            socketId: socketId
          }),

          success: (response) => {
            console.log('Registered[%s]: %s', socketId, JSON.stringify(response));

            // Listen for invalidations.
            this._socket.on('invalidate', (data) => {
              console.log('### INVALIDATE: %s', JSON.stringify(data));
              this._eventHandler.emit({ type: 'network.in' });

              // TODO(burdon): Invalidate specified queries.
              this._queryRegistry.invalidate();
            });

            resolve();
          },

          error: (error) => {
            reject(error);
          }
        });
      });
    });
  }
}

/**
 * Wrapper for network.
 */
export class NetworkManager {

  // TODO(burdon): Move to external defs.
  // NOTE: must be lowercase.
  static HEADER_REQUEST_ID  = 'mx-request-id';
  static HEADER_USER_ID     = 'mx-user-id';

  // TODO(burdon): Class or functor?

  constructor(eventListener, config) {

    // Log and match request/reponses.
    this._requestCount = 0;
    this._requestMap = new Map();

    // TODO(burdon): Configure via options.
    this._logger = new Logger();

    // TODO(burdon): Configure batching via options.
    // https://github.com/apollostack/core-docs/blob/master/source/network.md#query-batching

    // Create the interface.
    // http://dev.apollodata.com/core/network.html
    this._networkInterface = createNetworkInterface({
      uri: config.graphql
    });

    /**
     * Add headers for execution context.
     */
    const addHeaders = {
      applyMiddleware: ({ request, options }, next) => {

        // TODO(burdon): Cookies or header for auth?
        // https://github.com/apollostack/apollo-client/issues/132
        // https://github.com/github/fetch/blob/7f71c9bdccedaf65cf91b450b74065f8bed26d36/README.md#sending-cookies
        options.headers = _.defaults(options.headers, {
          [NetworkManager.HEADER_USER_ID]: config.userId
        });

        next();
      }
    };

    /**
     * TODO(burdon): Paging bug when non-null text filter.
     * https://github.com/apollostack/apollo-client/issues/897
     * "There can only be one fragment named ItemFragment" (from server).
     */
    const fixFetchMoreBug = {
      applyMiddleware: ({ request, options }, next) => {

        // Remove duplicate fragment.
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
        const requestId = `${request.operationName}:${++this._requestCount}`;
        this._requestMap.set(requestId, request);

        // Add header to track response.
        options.headers = _.assign(options.headers, {
          [NetworkManager.HEADER_REQUEST_ID]: requestId
        });

        this._logger.logRequest(requestId, request);

        eventListener.emit({ type: 'network.out' });

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
              this._logger.logResponse(requestId, response);

              // TODO(burdon): When can errors happen?
              console.assert(!response.errors);
            });
        } else {
          // GraphQL Error.
          response.clone().text().then(text => {
            eventListener.emit({ type: 'error', message: response.statusText });
          });
        }

        next();
      }
    };

    this._networkInterface
      .use([
        addHeaders,
        fixFetchMoreBug,
        logRequest
      ])
      .useAfter([
        logResponse
      ]);
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
    console.log('[%s] ===>>> [%s]: %s', moment().format(Logger.TIMESTAMP),
      requestId, JSON.stringify(request.variables || {}, TypeUtil.JSON_REPLACER));
  }

  logResponse(requestId, response) {
    console.log('[%s] <<<=== [%s]', moment().format(Logger.TIMESTAMP),
      requestId, JSON.stringify(response.data, TypeUtil.JSON_REPLACER));
  }

  logError(requestId, errors) {
    console.error('GraphQL Error [%s]:',
      requestId, errors.map(error => error.message));
  }
}

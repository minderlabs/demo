//
// Copyright 2016 Minder Labs.
//

'use strict';

import moment from 'moment';
import * as firebase from 'firebase';
import io from 'socket.io-client';

import { createNetworkInterface } from 'apollo-client';

import { TypeUtil } from 'minder-core';


/**
 * Manages user authentication.
 * Uses Firebase (all authentication performed by client).
 *
 * https://console.firebase.google.com/project/minder-beta
 * 1). Create project (minder-beta)
 * 2). Configure Auth providers (e.g., Google)
 */
export class AuthManager {

  constructor(config, networkManager) {
    console.assert(config && networkManager);

    this._networkManager = networkManager;

    // TODO(burdon): Factor out const (common).
    // https://console.firebase.google.com/project/minder-beta/overview
    firebase.initializeApp({
      apiKey: 'AIzaSyDwDsz7hJWdH2CijLItaQW6HmL7H9uDFcI',
      authDomain: 'minder-beta.firebaseapp.com',
      databaseURL: 'https://minder-beta.firebaseio.com',
      storageBucket: 'minder-beta.appspot.com',
      messagingSenderId: '189079594739'
    });

    // Google scopes.
    this._provider = new firebase.auth.GoogleAuthProvider();
    this._provider.addScope('https://www.googleapis.com/auth/plus.login');

    // TODO(burdon): Handle errors.
    // Check for auth changes (e.g., expired).
    firebase.auth().onAuthStateChanged(user => {
      console.log('Auth changed: ', user);
      if (user) {
        user.getToken().then(token => {
          // Update the network manager (sets header for graphql requests).
          this._networkManager.token = token;
        });
      } else {
        this._networkManager.token = null;

        // Prompt to login (triggers state change above).
        firebase.auth().signInWithPopup(this._provider);
      }
    });
  }
}

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

  constructor(config, networkManager, queryRegistry, eventHandler) {
    console.assert(config && networkManager && queryRegistry && eventHandler);

    this._networkManager = networkManager;
    this._queryRegistry = queryRegistry;
    this._eventHandler = eventHandler;

    // TODO(burdon): Switch to Firebase Cloud Messaging (with auto-reconnect).
    this._socket = io();
  }


  /**
   * Async connect
   * @returns {Promise}
   */
  connect() {
    console.log('Connecting...');

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
          headers: this._networkManager.headers,  // Includes JWT token.
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          data: JSON.stringify({
            clientId: config.clientId,
            socketId: socketId
          }),

          success: (response) => {
            console.log('Registered[%s]: %s', config.clientId, socketId);

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

  // NOTE: must be lowercase.
  static HEADER_REQUEST_ID  = 'minder-request-id';

  constructor(config, eventListener) {
    console.assert(config && eventListener);

    // Set token from server provided config.
    console.assert(config.user.token);
    this._token = config.user.token;

    // Log and match request/reponses.
    this._requestCount = 0;
    this._requestMap = new Map();

    // TODO(burdon): Configure via options.
    this._logger = new Logger(config.logging);

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

        // Set the JWT header.
        options.headers = _.defaults(options.headers, this.headers);

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

  /**
   * Returns the JWT header token used by the server to create the execution context.
   * @returns {{authentication: string}}
   */
  get headers() {
    console.assert(this._token);
    return {
      'authentication': 'Bearer ' + this._token
    }
  }

  /**
   * Sets the JWT token (e.g., after authentication changes).
   * @param token
   */
  set token(token) {
    this._token = token;
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

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import { print } from 'graphql-tag/printer';
import * as firebase from 'firebase';
import io from 'socket.io-client';

import { createNetworkInterface } from 'apollo-client';

import { FirebaseConfig, GoogleApiConfig } from '../common/defs';

const logger = Logger.get('net');

/**
 * Manages user authentication.
 * Uses Firebase (all authentication performed by client).
 *
 * https://console.firebase.google.com/project/minder-beta
 * 1). Create project (minder-beta)
 * 2). Configure Auth providers (e.g., Google)
 */
export class AuthManager {

  // Force re-auth.
  // https://firebase.google.com/docs/auth/web/manage-users#re-authenticate_a_user

  /**
   *
   * @param config
   * @param networkManager
   * @param connectionManager
   *
   * @return {Promise}
   */
  static init(config, networkManager, connectionManager) {
    console.assert(config && networkManager && connectionManager);

    this._networkManager = networkManager;

    // https://console.firebase.google.com/project/minder-beta/overview
    firebase.initializeApp(FirebaseConfig);

    // Google scopes.
    this._provider = new firebase.auth.GoogleAuthProvider();
    _.each(GoogleApiConfig.authScopes, scope => { this._provider.addScope(scope); });

    // TODO(burdon): Handle errors.
    // Check for auth changes (e.g., expired).
    firebase.auth().onAuthStateChanged(user => {

      if (user) {
        logger.log($$('Authenticated: %s', user.email));

        // https://firebase.google.com/docs/reference/js/firebase.User#getToken
        user.getToken().then(token => {

          // Update the network manager (sets header for graphql requests).
          this._networkManager.token = token;

          // Reconnect.
          connectionManager.connect();
        });
      } else {
        logger.log('Logged out');

        // Reset token.
        this._networkManager.token = null;

        // TODO(burdon): Can only be accessed from background page.
        // https://github.com/apollostack/apollo-client-devtools

        // Create OAuth client ID (Chrome App)
        // TODO(burdon): Make sure add dev and prod CRX IDs.
        // https://console.developers.google.com/apis/credentials?project=minder-beta
        // https://chrome.google.com/webstore/detail/minder/dkgefopdlgadfghkepoipjbiajpfkfpl
        // 189079594739-ngfnpmj856f7i0afsd6dka4712i0urij.apps.googleusercontent.com (Generated 1/24/17)

        // TODO(burdon): TypeError: Cannot read property 'getAuthToken' of undefined
        // https://developer.chrome.com/apps/app_identity
        // https://developer.chrome.com/apps/identity#method-getAuthToken
        /*
        chrome.identity.getAuthToken({ 'interactive': true }, (token) => {

          // https://firebase.google.com/docs/reference/js/firebase.auth.Auth#signInWithCredential
          let credential = firebase.auth.GoogleAuthProvider.credential(null, token);
          firebase.auth().signInWithCredential(credential);
        });
        */

        // Triggers state change above.
        firebase.auth().signInWithPopup(this._provider).then((result) => {
          logger.log('Popup result:', result);

          connectionManager.connect();
        });
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

    this._config = config;
    this._networkManager = networkManager;
    this._queryRegistry = queryRegistry;
    this._eventHandler = eventHandler;

    // TODO(burdon): Switch to Firebase Cloud Messaging (with auto-reconnect).
    this._socket = config.socket && io();
  }

  /**
   * Async connect
   * @returns {Promise}
   */
  connect() {
    logger.log('Connecting...');

    if (!this._socket) {
      return Promise.resolve();
    }

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
          headers: this._networkManager.headers,              // JWT authentication token.
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          data: JSON.stringify({
            clientId: this._config.clientId,
            socketId: socketId
          }),

          success: (response) => {
            logger.log($$('Registered[%s]: %s', this._config.clientId, socketId));

            // Listen for invalidations.
            this._socket.on('invalidate', (data) => {
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
    // NOTE: For the CRX the token will not be available until the login popup.
    this._token = config.user.token;

    // Log and match request/reponses.
    this._requestCount = 0;
    this._requestMap = new Map();

    // TODO(burdon): Configure via options.
    this._logger = new NetworkLogger(config.logging);

    // TODO(burdon): Configure batching via options.
    // https://github.com/apollostack/core-docs/blob/master/source/network.md#query-batching

    // Create the interface.
    // http://dev.apollodata.com/core/network.html
    // http://dev.apollodata.com/core/apollo-client-api.html#createNetworkInterface
    this._networkInterface = createNetworkInterface({
      uri: config.graphql
    });

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

              // Check GraphQL error.
              if (response.errors) {
                this._logger.logErrors(requestId, response.errors)
              } else {
                this._logger.logResponse(requestId, response);
              }
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
   * Exposes the interface for the Apollo client.
   * @returns {*}
   */
  get networkInterface() {
    return this._networkInterface;
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
class NetworkLogger {

  static TIMESTAMP = 'hh:mm:ss.SSS';

  // TODO(burdon): Verbose option.
  constructor(options) {}

  logRequest(requestId, request) {
    // TODO(burdon): How to serialize request.
    logger.log($$('[_TS_] ===>>> [%s] %o', requestId, request.variables || {}));

    // TODO(burdon): Optionally show graphiql link.
    console.info('[' + requestId + ']: ' + document.location.origin + '/graphiql?' +
      'query=' + encodeURIComponent(print(request.query)) +
      (request.variables ? '&variables=' + encodeURIComponent(JSON.stringify(request.variables)) : ''));
  }

  logResponse(requestId, response) {
    logger.log($$('[_TS_] <<<=== [%s] %o', requestId, response.data));
  }

  logErrors(requestId, errors) {
    logger.error($$('GraphQL Error [%s]: %s', requestId, errors.map(error => error.message)));
  }
}

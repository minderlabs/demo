//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import { print } from 'graphql-tag/printer';
import { createNetworkInterface } from 'apollo-client';
import * as firebase from 'firebase';

import { Async, HttpUtil, TypeUtil, Wrapper } from 'minder-core';

import { Const, FirebaseAppConfig, GoogleApiConfig } from '../../common/defs';

const logger = Logger.get('net');

/**
 * Manages user authentication.
 * Uses Firebase (all authentication performed by client).
 * https://firebase.google.com/docs/reference/node/firebase.auth.Auth
 *
 * https://console.firebase.google.com/project/minder-beta
 * 1). Create project (minder-beta)
 * 2). Configure Auth providers (e.g., Google)
 */
export class ClientAuthManager {

  /**
   * @param config
   * @param networkManager
   * @param connectionManager
   *
   * @return {Promise}
   */
  constructor(config, networkManager, connectionManager) {
    console.assert(config && networkManager && connectionManager);

    this._config = config;
    this._networkManager = networkManager;
    this._connectionManager = connectionManager;

    // https://console.firebase.google.com/project/minder-beta/overview
    firebase.initializeApp(FirebaseAppConfig);

    // Google scopes.
    this._provider = new firebase.auth.GoogleAuthProvider();
    _.each(GoogleApiConfig.authScopes, scope => {
      this._provider.addScope(scope);
    });

    this._unsubscribe = null;
  }

  /**
   * Triggers authentication if necessary, and subscribes to auth changes.
   *
   * @return {Promise}
   */
  authenticate() {
    return new Promise((resolve, reject) => {
      this._handleAuthStateChanges(registration => {
        resolve(registration);
      });
    });
  }

  /**
   * Sign-out and optionally reauthanticate.
   * @param reauthenticate
   */
  signout(reauthenticate=true) {

    // TODO(burdon): Re-authenticate?
    // https://firebase.google.com/docs/auth/web/manage-users#re-authenticate_a_user
    firebase.auth().signOut().then(() => {
      return Promise.resolve(reauthenticate && this.authenticate());
    });
  }

  /**
   * Subscribe to auth change updates and trigger auth as needed.
   * @param callback
   * @private
   */
  _handleAuthStateChanges(callback=undefined) {
    // TODO(burdon): Only call function once? If so, how to get first auth if already set.
    if (this._unsubscribe) {
      this._unsubscribe();
    }

    // TODO(burdon): Handle errors.
    // Check for auth changes (e.g., expired).
    // NOTE: This is triggered immediately if auth is required.
    // https://firebase.google.com/docs/auth/web/manage-users
    // https://firebase.google.com/docs/reference/node/firebase.auth.Auth#onAuthStateChanged
    this._unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
        logger.log('Authenticated: ' + user.email);

        // TODO(burdon): Get on each call?
        // http://stackoverflow.com/questions/38965681/when-to-refresh-expired-firebase3-web-token-for-api-request

        // https://firebase.google.com/docs/reference/js/firebase.User#getToken
        user.getToken().then(jwtToken => {

          // Update the network manager (sets header for graphql requests).
          this._networkManager.token = jwtToken;

          //
          // TODO(burdon): Rename register.
          // Connect (or reconnect) client.
          //
          Async.retry(attempt => {
            if (attempt > 0) {
              logger.log('Retrying ' + attempt);
            }

            // Connect and get registration info.
            return this._connectionManager.connect();
          }).then(registration => callback && callback(registration));
        });
      } else {
        logger.log('Authenticating...');

        // Reset token.
        this._networkManager.token = null;

        // Trigger authentication.
        this._doAuth().then(() => callback && callback());
      }
    });
  }

  /**
   * Authenitcate the user (based on platform).
   * @return {Promise}
   * @private
   */
  _doAuth() {
    if (_.get(this._config, 'app.platform') == Const.PLATFORM.CRX) {
      return this._doAuthChromeExtension();
    } else {
      return this._doAuthWebApp();
    }
  }

  /**
   * Create OAuth client ID (Chrome App) [store in manifset].
   * https://console.developers.google.com/apis/credentials?project=minder-beta
   * https://chrome.google.com/webstore/detail/minder/dkgefopdlgadfghkepoipjbiajpfkfpl
   * Prod: dkgefopdlgadfghkepoipjbiajpfkfpl
   * 189079594739-ngfnpmj856f7i0afsd6dka4712i0urij.apps.googleusercontent.com (Generated 1/24/17)
   * Dev:  ghakkkmnmckhhjangmlfnkpolkgahehp
   * 189079594739-fmlffnn0o5ka1nej028t44lp2v6knon7.apps.googleusercontent.com (Generated 1/25/17)
   * https://github.com/firebase/quickstart-js/blob/master/auth/chromextension/credentials.js
   *
   * @return {Promise}
   * @private
   */
  _doAuthChromeExtension() {
    return new Promise((resolve, reject) => {

      // NOTE: The OAuth2 token uses the scopes defined in the manifest (can be overridden below).
      let options = {
        interactive: true,
        scopes: GoogleApiConfig.authScopes
      };

      // NOTE: Can only be accessed from background page.
      // NOTE: This hangs if the manifest's oauth2 client_id is wronge (e.g., prod vs. dev).
      // https://developer.chrome.com/apps/app_identity
      // https://developer.chrome.com/apps/identity#method-getAuthToken
      chrome.identity.getAuthToken(options, accessToken => {
        if (chrome.runtime.lastError) {
          logger.error('Error getting access token:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        }

        // NOTE: Get Google specific credentials (since CRX!)
        // https://firebase.google.com/docs/reference/js/firebase.auth.GoogleAuthProvider
        logger.log('Retrieved access token:', accessToken);
        let credential = firebase.auth.GoogleAuthProvider.credential(null, accessToken);

        // TODO(burdon): Error (regression in lib: revert to 3.6.5)
        // npm install --save --save-exact firebase@3.6.5
        // [burdon 1/25/17] https://github.com/firebase/quickstart-js/issues/98 [ANSWERED]
        // [burdon 1/25/17] https://github.com/firebase/firebase-chrome-extension/issues/4
        // http://stackoverflow.com/questions/37865434/firebase-auth-with-facebook-oauth-credential-from-google-extension [6/22/16]
        // Sign-in failed: {"code":"auth/internal-error","message":"{\"error\":{\"errors\":[{\"domain\":\"global\",
        // \"reason\":\"invalid\",\"message\":\"INVALID_REQUEST_URI\"}],\"code\":400,\"message\":\"INVALID_REQUEST_URI\"}}"}

        // NOTE: If the manifest's oauth2 client_id doesn't match,
        // the auth promt happens but then the signin method doesn't return.
        // https://firebase.google.com/docs/reference/js/firebase.auth.Auth#signInWithCredential
        firebase.auth().signInWithCredential(credential)
          .then(result => {
            let user = firebase.auth().currentUser;
            resolve(user);
          })
          .catch(error => {
            logger.error('Sign-in failed:', JSON.stringify(error));

            // The OAuth token might have been invalidated; remove the token and try again.
            if (error.code === 'auth/invalid-credential') {
              chrome.identity.removeCachedAuthToken({ token: accessToken }, () => {
                this._doAuthChromeExtension().then(user => resolve(user));
              });
            }

            // TODO(burdon): Just hangs if user closes Login page?
            reject(error);
          });
      });
    });
  }

  /**
   * Show web popup.
   * @private
   */
  _doAuthWebApp() {
    // NOTE: Triggers state change above.
    // https://firebase.google.com/docs/reference/js/firebase.auth.Auth.html#signInWithPopup
    return firebase.auth().signInWithPopup(this._provider)
      .then(result => {
        return firebase.auth().currentUser;
      })
      .catch(error => {
        logger.error('Sign-in failed:', JSON.stringify(error));
      });
  }
}

/**
 * Manages the client connection and registration.
 */
export class ConnectionManager {
  
  /**
   * Registers client (and push socket).
   *
   * @param {object} config
   * @param {NetworkManager} networkManager
   * @param {QueryRegistry}queryRegistry
   * @param {EventHandler} eventHandler
   */
  constructor(config, networkManager, queryRegistry=undefined, eventHandler=undefined) {
    console.assert(config && networkManager);

    this._config = config;
    this._networkManager = networkManager;
    this._queryRegistry = queryRegistry;
    this._eventHandler = eventHandler;
  }

  // TODO(burdon): Rationalize connect/disconnect register/unregister names.

  /**
   * Async connect
   * @returns {Promise}
   */
  connect() {
    logger.log('Connecting...');

    // TODO(burdon): Works with CRX?
    // https://developer.chrome.com/apps/gcm
    // 3/1/17 Send support message: https://firebase.google.com/support/contact/troubleshooting

    // https://github.com/firebase/quickstart-js/blob/master/messaging/index.html

    // https://firebase.google.com/docs/cloud-messaging/js/receive#handle_messages_when_your_web_app_is_in_the_foreground
    firebase.messaging().onMessage(payload => {
      logger.log('### FCM ###', payload);
      this._eventHandler && this._eventHandler.emit({ type: 'network.in' });
      this._queryRegistry && this._queryRegistry.invalidate();
    });

    // TODO(burdon): Integrate with below.
    // https://firebase.google.com/docs/cloud-messaging/js/client#monitor-token-refresh
    firebase.messaging().onTokenRefresh(() => {
      logger.warn('### REFRESH ###');
    });

    // https://firebase.google.com/docs/cloud-messaging/js/client#request_permission_to_receive_notifications
    return firebase.messaging().requestPermission().then(() => {

      // NOTE: Requires HTTPS (for Service workers); localhost supported for development.
      // https://developers.google.com/web/fundamentals/getting-started/primers/service-workers#you_need_https
      return firebase.messaging().getToken().then(messageToken => {
        if (!messageToken) {
          logger.warn('FCM Token expired.');
        }

        // Register token with server.
        logger.log('FCM Enabled: ' + messageToken);
        return this._doRegistration({ messageToken });
      });
    }).catch(error => {
      logger.warn('FCM Registration failed:', error);
      return this._doRegistration();
    });
  }

  /**
   * Unregisters the client.
   * @param async Defaults to synchronous (since page may be unloading).
   * @returns {Promise}
   */
  disconnect(async=false) {
    return new Promise((resolve, reject) => {
      let url = HttpUtil.joinUrl(this._config.server || HttpUtil.getServerUrl(), '/client/unregister');

      // TODO(burdon): Factor out post.
      $.ajax({
        url: url,
        type: 'POST',
        async,
        // TODO(burdon): Add client ID to header.
        headers: this._networkManager.headers,              // JWT authentication token.
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
          clientId: _.get(this._config, 'registration.clientId', undefined)
        }),

        success: () => {
          resolve();
        },

        error: error => {
          reject(error);
        }
      });
    });
  }

  /**
   * Register client with server.
   * @param {object} registration
   * @return {Promise}
   * @private
   */
  _doRegistration(registration=undefined) {
    // TODO(burdon): If web platform then assert.
    registration = _.merge({}, registration, {
      platform: _.get(this._config, 'app.platform'),
      clientId: _.get(this._config, 'registration.clientId', undefined)
    });

    // See clientRouter on server.
    // TODO(burdon): URL const.
    let url = HttpUtil.joinUrl(this._config.server || HttpUtil.getServerUrl(), '/client/register');
    logger.log(`Registering client [${url}]: ${JSON.stringify(registration)}`);
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: 'POST',
        headers: this._networkManager.headers,              // JWT authentication token.
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify(registration),

        success: registration => {
          console.assert(registration.clientId);
          logger.info('Registered: ' + JSON.stringify(registration));
          resolve(registration);
        },

        error: error => {
          logger.error('Registration failed: ' + JSON.stringify(error));
          reject(error);
        }
      });
    });
  }
}

/**
 * Wrapper for the Apollo network interface.
 */
export class NetworkManager {

  // NOTE: must be lowercase.
  static HEADER_REQUEST_ID  = 'minder-request-id';

  /**
   *
   * @param {object }config
   * @param {EventHandler} eventHandler
   */
  constructor(config, eventHandler=undefined) {
    console.assert(config);
    this._config = config;

    // Set token from server provided config.
    // NOTE: For the CRX the token will not be available until the login popup.
    this._token = _.get(config, 'user.token');

    // Emit network events.
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
        // Set the JWT header.
        options.headers = _.defaults(options.headers, this.headers);

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
        this._eventHandler && this._eventHandler.emit({ type: 'network.out' });
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
                this._eventHandler && this._eventHandler.emit({
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
            this._eventHandler && this._eventHandler.emit({
              type: 'error',
              message: NetworkLogger.stringify(response.errors)
            });
          });
        }

        next();
      }
    };

    // http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
    this._networkInterface
      .use([
        addHeaders,
        fixFetchMoreBug,
        logRequest
      ])
      .useAfter([
        logResponse
      ]);

    logger.log('Initialized.');
    return this;
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
    // TODO(burdon): Async getToken here.
    console.assert(this._token, 'Not authenticated.');
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

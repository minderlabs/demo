//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Const } from '../../common/defs';

import { AuthManager } from './auth';
import { NetUtil } from './net';

const logger = Logger.get('client');

/**
 * Manages the client connection and registration.
 */
export class ConnectionManager {

  /**
   * Client ID header.
   * @param {string} clientId
   */
  static getHeaders(clientId) {
    console.assert(_.isString(clientId), 'Invalid client ID: ' + clientId);
    return {
      [Const.HEADER.CLIENT_ID]: clientId
    };
  }

  /**
   * Registers client (and push socket).
   *
   * @param {object} config
   * @param {AuthManager} authManager
   * @param {CloudMessenger} cloudMessenger
   */
  constructor(config, authManager, cloudMessenger=undefined) {
    console.assert(config && authManager);
    this._config = config;
    this._authManager = authManager;
    this._cloudMessenger = cloudMessenger;

    // The CRX token may be automatically refreshed (FCM).
    this._cloudMessenger && this._cloudMessenger.onTokenUpdate(messageToken => {
      this._requestRegistration(messageToken);
    });
  }

  /**
   * Client registration (see clientRouter => ClientManager.register).
   * NOTE: For client platform uniformity, the registration is stored in the config property.
   * Web apps have the registration information set by the server on page load, whereas the CRX
   * retrieves the registration when registering the client.
   *
   * // TODO(burdon): Registration vs UserProfile (reconcile user/client registration).
   * {
   *   userId,
   *   groupId,       // TODO(burdon): Remove.
   *   clientId
   * }
   */
  get registration() {
    return _.get(this._config, 'registration');
  }

  /**
   * Register the client with the server.
   * Web clients are served from the server, which configures registration properties (see webAppRouter).
   * CRX and mobile clients must register to obtain this information (e.g., clientId).
   * Clients also register their Cloud Messaging (FCM, GCM) tokens (which may need to be refreshed).
   * Client must also provide the clientId to request headers.
   *
   * [ConnectionManager] ==> [ClientManager]
   *
   * @return {Promise<Registration>}
   */
  register() {
    if (this._cloudMessenger) {
      return this._cloudMessenger.connect().then(messageToken => {
        return this._requestRegistration(messageToken);
      });
    } else {
      return this._requestRegistration();
    }
  }

  /**
   * Sends the client registration request.
   *
   * @param messageToken
   * @return {Promise.<{Registration}>}
   * @private
   */
  _requestRegistration(messageToken=undefined) {

    // Current client.
    let clientId = _.get(this._config, 'registration.clientId');

    // Assigned on load for Web clients.
    let platform = _.get(this._config, 'app.platform');
    if (!clientId && platform === Const.PLATFORM.WEB) {
      console.assert(clientId);
    }

    let requestUrl = NetUtil.getUrl('/client/register', this._config.server);

    let headers = AuthManager.getHeaders(this._authManager.idToken);
    if (clientId) {
      _.assign(headers, ConnectionManager.getHeaders(clientId));
    }

    let request = {
      platform,
      messageToken
    };

    // TODO(burdon): Configure Retry (perpetual with backoff for CRX?)
    logger.log(`Registering client [${clientId}]: (${JSON.stringify(request)})`);
    return NetUtil.postJson(requestUrl, request, headers).then(registration => {
      logger.info('Registered: ' + JSON.stringify(registration));

      // TODO(burdon): Store in config?
      _.set(this._config, 'registration', registration);
      return registration;
    });
  }

  /**
   * Unregisters the client.
   *
   * @param async Defaults to synchronous (since page may be unloading).
   * @returns {Promise}
   */
  unregister(async=false) {
    if (!this.registration) {
      return Promise.resolve();
    }

    // Current client.
    let clientId = _.get(this._config, 'registration.clientId');

    let requestUrl = NetUtil.getUrl('/client/unregister', this._config.server);

    let headers = _.assign({},
      AuthManager.getHeaders(this._authManager.idToken),
      ConnectionManager.getHeaders(clientId));

    return NetUtil.postJson(requestUrl, {}, headers, async).then(() => {
      logger.log('Unregistered: ' + clientId);
    });
  }
}

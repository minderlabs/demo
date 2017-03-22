//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { HttpUtil } from 'minder-core';

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
    console.assert(clientId);
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
  constructor(config, authManager, cloudMessenger) {
    console.assert(config && authManager && cloudMessenger);
    this._config = config;
    this._authManager = authManager;
    this._cloudMessenger = cloudMessenger;

    // The CRX token may be automatically refreshed (FCM).
    this._cloudMessenger.onTokenUpdate(messageToken => {
      logger.info('Token refreshed.');

      // Get/refresh the auth token.
      this._authManager.getToken().then(authToken => {

        // Re-register the client.
        this._doRegistration(authToken, messageToken);
      })
    });
  }

  /**
   * Client registration (see clientRouter => ClientManager.register).
   * NOTE: For client platform uniformity, the registration is stored in the config property.
   * Web apps have the registration information set by the server on page load, whereas the CRX
   * retrieves the registration when registering the client.
   *
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
   * @return {Promise<{Registration}>}
   */
  register() {
    // Get the push channel token.
    // TODO(burdon): Store the message token (for re-registration?)
    return this._cloudMessenger.connect().then(messageToken => {
      logger.log('Cloud Messenger connected.');

      let registerUrl = NetUtil.getUrl('/client/register', this._config.server);

      let platform = _.get(this._config, 'app.platform');
      let clientId = _.get(this._config, 'registration.clientId');
      if (!clientId && platform === Const.PLATFORM.WEB) {
        console.assert(clientId);
      }

      let headers = AuthManager.getHeaders(this._authManager.getToken());
      if (clientId) {
        _.assign(headers, ConnectionManager.getHeaders(clientId));
      }

      let request = {
        platform,
        messageToken
      };

      // TODO(burdon): Configure Retry (perpetual with backoff for CRX?)
      logger.log(`Registering client: ${clientId || platform} (${registerUrl})`);
      return NetUtil.postJson(registerUrl, request, headers).then(registration => {
        logger.info('Registered client: ' + JSON.stringify(registration));
        _.set(this._config, 'registration', registration);
        return registration;
      });
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

    let url = HttpUtil.joinUrl(this._config.server || HttpUtil.getServerUrl(), '/client/unregister');

    let headers = _.merge(
      AuthManager.getHeaders(this._authManager.getToken()),
      ConnectionManager.getHeaders(this.registration.clientId));

    return NetUtil.postJson(url, {}, headers, async);
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { AuthDefs, AuthUtil } from 'minder-core';
import { NetUtil } from 'minder-ux';

import { Const } from '../../common/defs';

import { AuthManager } from './auth';

const logger = Logger.get('client');

/**
 * Manages the client connection and registration.
 */
export class ConnectionManager {

  /**
   * Client ID header.
   * @param headers
   * @param {string} clientId
   * @returns headers
   */
  static setClientHeader(headers, clientId) {
    console.assert(_.isString(clientId), 'Invalid client ID.');
    return _.assign(headers, {
      [Const.HEADER.CLIENT_ID]: clientId
    });
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
   * Returns the registered client ID.
   */
  get clientId() {
    let clientId = _.get(this._config, 'client.id');
    console.assert(clientId);
    return clientId;
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
   * @return {Promise<Client>}
   */
  register() {
    if (this._cloudMessenger) {
      return this._cloudMessenger.connect()
        .then(messageToken => {
          return this._registerClient(messageToken);
        })
        .catch(error => {
          logger.warn(error);
          return this._registerClient();
        });
    } else {
      return this._registerClient();
    }
  }

  /**
   * Sends the client registration request.
   *
   * @param messageToken
   * @return {Promise<Client>}
   * @private
   */
  _registerClient(messageToken=undefined) {

    // Assigned on load for Web clients.
    let platform = _.get(this._config, 'app.platform');

    let requestUrl = NetUtil.getUrl('/client/register', this._config.server);

    let headers = AuthUtil.setAuthHeader({}, this._authManager.idToken);

    let clientId = _.get(this._config, 'client.id');
    if (clientId) {
      ConnectionManager.setClientHeader(headers, clientId);
    } else {
      // Web client should have ID.
      console.assert(platform !== Const.PLATFORM.WEB);
    }

    let request = { platform, messageToken };

    // TODO(burdon): Configure Retry (perpetual with backoff for CRX?)
    logger.log(`Registering client [${clientId}]: (${JSON.stringify(request)})`);
    return NetUtil.postJson(requestUrl, request, headers).then(result => {
      logger.info('Registered: ' + JSON.stringify(result));
      let { client } = result;
      _.assign(this._config, { client });
      return client;
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

    let requestUrl = NetUtil.getUrl('/client/unregister', this._config.server);

    let headers = {};
    AuthUtil.setAuthHeader(headers, this._authManager.idToken);
    ConnectionManager.setClientHeader(headers, _.get(this._config, 'client.id'));

    return NetUtil.postJson(requestUrl, {}, headers, { async }).then(() => {
      logger.log('Unregistered: ' + clientId);
    });
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { HttpUtil } from 'minder-core';

import { AuthManager } from './auth';

const logger = Logger.get('client');

/**
 * Manages the client connection and registration.
 */
export class ConnectionManager {

  // TODO(burdon): Separate FCM (from gcm for CRX).
  // TODO(burdon): Rationalize connect/disconnect register/unregister names.

  /**
   * Registers client (and push socket).
   *
   * @param {object} config
   * @param {AuthManager} authManager
   * @param {PushManager} pushManager
   * @param {EventHandler} eventHandler
   */
  constructor(config, authManager, pushManager, eventHandler) {
    console.assert(config && authManager && pushManager && eventHandler);
    this._config = config;
    this._authManager = authManager;
    this._pushManager = pushManager;
    this._eventHandler = eventHandler;
  }

  /**
   * Register client with server.
   *
   * @return {Promise}
   * @private
   */
  register() {
    let url = HttpUtil.joinUrl(this._config.server || HttpUtil.getServerUrl(), '/client/register');
    logger.log(`Registering client... [${url}]`);

    // Get the auth token.
    return this._authManager.getToken().then(token => {

      // TODO(burdon): Add client ID to header.
      let headers = AuthManager.getHeaders(token);

      // Get the push channel token.
      // TODO(burdon): Make configurable?
      return this._pushManager.connect().then(messageToken => {

        // TODO(burdon): If web platform then assert registration.
        let request = {
          platform: _.get(this._config, 'app.platform'),
          clientId: _.get(this._config, 'registration.clientId', undefined),
          messageToken
        };

        return ConnectionManager.postJson(url, request, headers).then(registration => {
          logger.info('Registered client: ' + JSON.stringify(registration));
          return registration;
        });
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
    let url = HttpUtil.joinUrl(this._config.server || HttpUtil.getServerUrl(), '/client/unregister');

    // Get the auth token.
    return this._authManager.getToken().then(token => {

      // TODO(burdon): Add client ID to header.
      let headers = AuthManager.getHeaders(token);

      let request = {
        clientId: _.get(this._config, 'registration.clientId', undefined)
      };

      return ConnectionManager.postJson(url, request, headers, async);
    });
  }

  /**
   * AJAX Post.
   *
   * @param url
   * @param data
   * @param headers
   * @param async
   * @return {Promise}
   */
  // TODO(burdon): Factor out (without dependency on $).
  static postJson(url, data, headers={}, async=true) {
    console.assert(url && data && headers);
    return new Promise((resolve, reject) => {
      $.ajax({
        type: 'POST',
        url,
        async,
        headers,

        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify(data),

        success: response => { resolve(response) },
        error: error => { reject(error) }
      });
    });
  }
}

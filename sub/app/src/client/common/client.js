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

  /**
   * Registers client (and push socket).
   *
   * @param {object} config
   * @param {AuthManager} authManager
   * @param {PushManager} pushManager
   */
  constructor(config, authManager, pushManager) {
    console.assert(config && authManager && pushManager);
    this._config = config;
    this._authManager = authManager;
    this._pushManager = pushManager;
    this._registration = null;
  }

  get registration() {
    return this._registration;
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

        // TODO(burdon): Configure Retry (e.g., perpetual for CRX).
        return ConnectionManager.postJson(url, request, headers).then(registration => {
          logger.info('Registered client: ' + JSON.stringify(registration));
          this._registration = registration;
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

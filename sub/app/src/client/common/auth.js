//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { HttpUtil } from 'minder-core';

import { Const } from '../../common/defs';

import { NetUtil } from './net';

const logger = Logger.get('auth');

/**
 * Manages Web Client authentication.
 */
export class AuthManager {

  // TODO(burdon): Generalize for other clients (mobile, command linet)?

  /**
   * Return the authentication header.
   * https://en.wikipedia.org/wiki/Basic_access_authentication
   * @param {string} id_token JWT token.
   */
  static getHeaders(id_token) {
    console.assert(_.isString(id_token));
    return {
      'Authorization': 'Bearer ' + id_token
    }
  }

  /**
   * @param config
   *
   * @return {Promise}
   */
  constructor(config) {
    console.assert(config);
    this._config = config;

    // JWT.
    this._token = null;
  }

  /**
   * Returns the JWT (id_token).
   *
   * @returns {string}
   */
  // TODO(burdon): Error handling.
  getToken() {
    return this._token;
  }

  /**
   * Uses the OpenID OAuth2 mechanism to obtain the Google id_token (and refresh_token).
   * NOTE: The "official" Google API (chrome.identity.getAuthToken) only returns the access_token.
   *
   * NOTES:
   * - Update the manifest's OAuth client ID.
   * - Update the manifest Key property (ensures the dev and published CRX IDs are the same).
   * - Register the CRX with the Web Client OAuth callbacks:
   *   E.g., https://ofdkhkelcafdphpddfobhbbblgnloian.chromiumapp.org/google
   *
   * @private
   */
  authenticate() {
    logger.log('Authenticating...');
    return new Promise((resolve, reject) => {

      // TODO(burdon): Return now if web.
      // TODO(burdon): Standardize userProfile and registration.
      let platform = _.get(this._config, 'app.platform');
      if (platform === Const.PLATFORM.WEB) {
        let registration = _.get(this._config.registration);
        this._token = registration.idToken;
        resolve(registration);
      }

      // TODO(burdon): Factor out client provider.
      const OAuthProvider = {
        provider: 'google',

        requestUrl: 'https://accounts.google.com/o/oauth2/auth',

        // https://developers.google.com/identity/protocols/OpenIDConnect#obtaininguserprofileinformation
        scope: [
          'openid',
          'profile',
          'email'
        ]
      };

      // TODO(burdon): Const.
      // NOTE: This is NOT the Chrome Extension's Client ID (in the manifest).
      const webClientId = '189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com';

      // Get the access and id tokens.
      // NOTE: We don't require offline access (refresh_token) since this is requested when registering services.
      // NOTE: If did request "offline" then requesting both access and id tokens would fail.
      // https://developers.google.com/identity/protocols/OpenIDConnect#authenticationuriparameters
      let requestParams = {
        client_id: webClientId,
        response_type: 'token id_token',                                        // access_token and id_token (JWT).
        redirect_uri: chrome.identity.getRedirectURL(OAuthProvider.provider),   // Registered URL.
        scope: OAuthProvider.scope.join(' '),
        state: String(new Date().getTime())                                     // Check same state below.
      };

      // TODO(burdon): Const.
      // TODO(burdon): Move auth to minder-core.
      let requestUrl = HttpUtil.toUrl(OAuthProvider.requestUrl, requestParams);

      let options = {
        url: requestUrl,
        interactive: true
      };

      // https://developer.chrome.com/apps/identity#method-launchWebAuthFlow
      chrome.identity.launchWebAuthFlow(options, callbackUrl => {
        if (chrome.runtime.lastError) {
          // "Authorization page could not be loaded" masks all errors.
          // To debug right-click to Copy Link Address to browser (logged URL on console is truncated).
          // Errors:
          // "redirect_uri_mismatch"    Registered URL.
          // "invalid_client"           Web Client ID does not match.
          logger.info('Auth: ' + requestUrl);
          logger.info(JSON.stringify(requestParams, null, 2));
          throw new Error(chrome.runtime.lastError.message);
        }

        let responseParams = HttpUtil.parseUrlParams(callbackUrl, '#');
//      logger.log('===>>>', JSON.stringify(requestParams, null, 2));
//      logger.log('<<<===', JSON.stringify(responseParams, null, 2));
        console.assert(responseParams.state === requestParams.state, 'Invalid state.');

        let credentials = _.assign(_.pick(responseParams, ['access_token', 'id_token']), {
          provider: OAuthProvider.provider
        });

        this._token = credentials.id_token;

        this.registerUser(credentials).then(userProfile => {
          console.log('############', JSON.stringify(userProfile, 0, 2));
          resolve(userProfile);
        });
      });
    });
  }

  /**
   * Registers the user with the (JWT) id_token returned from the OAuth login flow.
   * Returns the user profile.
   *
   * @param credentials
   * @returns {Promise<{UserProfile}>}
   */
  registerUser(credentials) {
    let registerUrl = NetUtil.getUrl('/user/register', this._config.server);
    let headers = AuthManager.getHeaders(credentials.id_token);
    return NetUtil.postJson(registerUrl, { credentials }, headers);
  }

  /**
   * Sign-out and optionally reauthanticate.
   *
   * @param reauthenticate
   * @returns {Promise}
   */
  signout(reauthenticate=true) {
    logger.log('Signing out...');

    // NOTE: We don't have an access token.
    // https://developer.chrome.com/apps/identity#method-removeCachedAuthToken

    // https://accounts.google.com/o/oauth2/revoke?token={token}

    // TODO(burdon): onSignInChanged
    // http://stackoverflow.com/questions/26080632/how-do-i-log-out-of-a-chrome-identity-oauth-provider
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: 'https://accounts.google.com/logout'
      }, tokenUrl => {
        if (reauthenticate) {
          this.authenticate().then(resolve);
        } else {
          return resolve();
        }
      });
    });
  }
}

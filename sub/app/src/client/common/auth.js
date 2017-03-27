//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { HttpUtil } from 'minder-core';

import { Const, GoogleApiConfig } from '../../common/defs';

import { NetUtil } from './net';

const logger = Logger.get('auth');

/**
 * Manages Web Client authentication.
 */
export class AuthManager {

  // TODO(burdon): Generalize for other clients (mobile, command line)?

  // TODO(burdon): Client/Server consts (OAuthProvider.DEFAULT_LOGIN_SCOPES).
  // https://developers.google.com/identity/protocols/OpenIDConnect#obtaininguserprofileinformation
  static DEFAULT_LOGIN_SCOPES = [
    'openid',
    'profile',
    'email'
  ];

  /**
   * Return the authentication header.
   * https://en.wikipedia.org/wiki/Basic_access_authentication
   * @param {string} idToken JWT token.
   */
  static getHeaders(idToken) {
    console.assert(_.isString(idToken), 'Invalid token: ' + idToken);
    return {
      'Authorization': 'Bearer ' + idToken
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
  }

  /**
   * Returns the JWT (id_token).
   *
   * @returns {string}
   */
  get idToken() {
    let idToken = _.get(this._config, 'credentials.id_token');
    console.assert(idToken, 'Invalid token: ' + JSON.stringify(_.get(this._config, 'credentials')));
    return idToken;
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
   * @return {UserProfile} User profile object { id, email, displayName, photoUrl }
   */
  authenticate() {
    let platform = _.get(this._config, 'app.platform');
    if (platform === Const.PLATFORM.WEB) {
      // Web is already authenticated and registered.
      console.assert(this.idToken);
      return Promise.resolve(_.get(this._config, 'userProfile'));
    } else {
      // Trigger OAuth flow.
      return this._launchWebAuthFlow().then(credentials => {
        return this._registerUser(credentials).then(userProfile => {
          _.assign(this._config, { userProfile });
          return userProfile;
        });
      });
    }
  }

  /**
   * Triggers the OAuth flow if necessary, returning the credentials.
   *
   * @return {Promise}
   * @private
   */
  _launchWebAuthFlow() {
    return new Promise((resolve, reject) => {
      logger.log('Authenticating...');

      // TODO(burdon): Factor out client provider.
      const OAuthProvider = {
        provider: 'google',
        requestUrl: 'https://accounts.google.com/o/oauth2/auth',
        scope: AuthManager.DEFAULT_LOGIN_SCOPES
      };

      // Get the access and id tokens.
      // NOTE: We don't require offline access (refresh_token) since this is requested when registering services.
      // NOTE: If did request "offline" then requesting both access and id tokens would fail.
      // NOTE: The clientId is the Web Client, NOT the Chrome Extension's Client ID (in the manifest).
      // https://developers.google.com/identity/protocols/OpenIDConnect#authenticationuriparameters
      let requestParams = {
        client_id: GoogleApiConfig.clientId,
        response_type: 'token id_token',                                        // access_token and id_token (JWT).
        redirect_uri: chrome.identity.getRedirectURL(OAuthProvider.provider),   // Registered URL.
        scope: OAuthProvider.scope.join(' '),
        state: String(new Date().getTime())                                     // Check same state below.
      };

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

        // Update config.
        _.assign(this._config, { credentials });

        resolve(credentials);
      });
    });
  }

  /**
   * Registers the user with the (JWT) id_token returned from the OAuth login flow.
   * Returns the user profile.
   *
   * @param credentials
   * @returns {Promise<UserProfile>}
   */
  _registerUser(credentials) {
    let registerUrl = NetUtil.getUrl('/user/register', this._config.server);
    let headers = AuthManager.getHeaders(credentials.id_token);
    return NetUtil.postJson(registerUrl, { credentials }, headers).then(result => {
      let { userProfile } = result;

      logger.log('Registered User: ' + JSON.stringify(userProfile));
      return userProfile;
    });
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

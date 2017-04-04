//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { AuthDefs, AuthUtil, HttpUtil } from 'minder-core';
import { NetUtil } from 'minder-ux';

import { Const, GoogleApiConfig } from '../../common/defs';

const logger = Logger.get('auth');

/**
 * Manages Web Client authentication.
 */
export class AuthManager {

  // TODO(burdon): Generalize for other clients (mobile, command line)?

  /**
   * Return the authentication header.
   * https://en.wikipedia.org/wiki/Basic_access_authentication
   * @param {string} idToken JWT token.
   */
  static getHeaders(idToken) {
    console.assert(_.isString(idToken), 'Invalid token: ' + idToken);
    return {
      'Authorization': 'JWT ' + idToken
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
    if (_.get(window, 'chrome.identity')) {
      // CRX OAuth flow.
      return this._launchWebAuthFlow().then(userProfile => {
        _.assign(this._config, { userProfile });
        return userProfile;
      });
    } else {
      // Web is already authenticated and registered.
      console.assert(this.idToken);
      return Promise.resolve(_.get(this._config, 'userProfile'));
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

      // TODO(burdon): Factor out.
      const OAuthProvider = {
        provider: 'google',
        requestUrl: NetUtil.getUrl('/oauth/login/google', this._config.server),
        scope: AuthDefs.GOOGLE_LOGIN_SCOPES
      };

      let requestParams = {
        redirectType: 'crx',
        redirectUrl: chrome.identity.getRedirectURL(OAuthProvider.provider),    // Registered URL.
        requestId: String(Date.now())                                           // Verified below.
      };

      let options = {
        url: HttpUtil.toUrl(OAuthProvider.requestUrl, requestParams),

        // Show login screen if necessary.
        interactive: true
      };

      // https://developer.chrome.com/apps/identity#method-launchWebAuthFlow
      // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/identity/launchWebAuthFlow
      chrome.identity.launchWebAuthFlow(options, callbackUrl => {
        if (chrome.runtime.lastError) {
          // "Authorization page could not be loaded" masks all errors.
          // To debug right-click to Copy Link Address to browser (logged URL on console is truncated).
          // Errors:
          // "redirect_uri_mismatch"    Registered URL.
          // "invalid_client"           Web Client ID does not match.
          throw new Error(chrome.runtime.lastError.message + ' [' + options.url + ']');
        }

        let callbackArgs = HttpUtil.parseUrlParams(callbackUrl);
        console.assert(callbackArgs.requestId === requestParams.requestId, 'Invalid state.');

        // Update config.
        _.assign(this._config, {
          credentials: JSON.parse(callbackArgs.credentials),
          userProfile: JSON.parse(callbackArgs.userProfile)
        });

        resolve(_.get(this._config, 'userProfile'));
      });
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

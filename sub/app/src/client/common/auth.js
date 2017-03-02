//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import * as firebase from 'firebase';

import { Const, FirebaseAppConfig, GoogleApiConfig } from '../../common/defs';

const logger = Logger.get('auth');

/**
 * Manages user authentication.
 * Uses Firebase (all authentication performed by client).
 *
 * https://firebase.google.com/docs/auth
 * https://firebase.google.com/docs/reference/node/firebase.auth.Auth
 *
 * https://console.firebase.google.com/project/minder-beta
 * 1). Create project (minder-beta)
 * 2). Configure Auth providers (e.g., Google)
 */
export class AuthManager {

  /**
   * Return the authentication header.
   * @param {string} token JWT token.
   */
  static getHeaders(token) {
    return {
      'authentication': 'Bearer ' + token
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

    // https://console.firebase.google.com/project/minder-beta/overview
    firebase.initializeApp(FirebaseAppConfig);

    // Google scopes.
    this._authProvider = new firebase.auth.GoogleAuthProvider();
    _.each(GoogleApiConfig.authScopes, scope => {
      this._authProvider.addScope(scope);
    });

    // Unsubscribe function.
    this._unsubscribe = null;
  }

  /**
   * Subscribe to auth change updates and trigger auth as needed.
   * @return {Promise<User>}
   */
  authenticate() {
    this._unsubscribe && this._unsubscribe();

    return new Promise((resolve, reject) => {

      // TODO(burdon): Handle errors.
      // Check for auth changes (e.g., expired).
      // NOTE: This is triggered immediately if already authenticated.
      // https://firebase.google.com/docs/auth/web/manage-users#get_the_currently_signed-in_user
      // https://firebase.google.com/docs/reference/node/firebase.auth.Auth#onAuthStateChanged
      this._unsubscribe = firebase.auth().onAuthStateChanged(user => {
        if (user) {
          logger.log('Authenticated: ' + user.email);
          resolve(user);
        } else {
          return this._doAuth();
        }
      });
    });
  }

  /**
   * Asynchronously returns the JWT token. Refreshes the token if necessary.
   * @return {Promise<JWT>}
   */
  getToken() {
    let user = firebase.auth().currentUser;

    // https://firebase.google.com/docs/reference/js/firebase.User#getToken
    return user.getToken();
  }

  /**
   * Sign-out and optionally reauthanticate.
   * @param reauthenticate
   */
  signout(reauthenticate=true) {

    // TODO(burdon): Re-authenticate?
    // https://firebase.google.com/docs/auth/web/manage-users#re-authenticate_a_user
    firebase.auth().signOut();
  }

  /**
   * Authenitcate the user (based on platform).
   *
   * @return {Promise<User>}
   * @private
   */
  _doAuth() {
    if (_.get(this._config, 'app.platform') === Const.PLATFORM.CRX) {
      return this._doAuthChromeExtension();
    } else {
      return this._doAuthWebApp();
    }
  }

  /**
   * Show web popup.
   *
   * @return {Promise<User>}
   * @private
   */
  _doAuthWebApp() {
    logger.log('Authenticate Web app...');

    // NOTE: Triggers state change above.
    // https://firebase.google.com/docs/reference/js/firebase.auth.Auth.html#signInWithPopup
    return firebase.auth().signInWithPopup(this._authProvider)
      .then(result => {
        return firebase.auth().currentUser;
      })
      .catch(error => {
        logger.error('Sign-in failed:', JSON.stringify(error));
      });
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
   * @return {Promise<User>}
   * @private
   */
  _doAuthChromeExtension() {
    logger.log('Authenticate CRX app...');

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
}

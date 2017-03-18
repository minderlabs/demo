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
    console.assert(token);
    return {
      [Const.HEADER.AUTHORIZATION]: 'Bearer ' + token
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
   * @param force If true, then trigger authentication if logged out.
   * @return {Promise<User>}
   */
  authenticate(force=false) {
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
          // NOTE: This is called if the user logs out from elsewhere.
          // So, by default we don't prompt (unless CRX).
          logger.log('Signed out.');
          return force ? this._doAuth() : Promise.resolve(null);
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
    if (!user) {
      return Promise.reject(null);
    }

    // https://firebase.google.com/docs/reference/js/firebase.User#getToken
    return user.getToken();
  }

  /**
   * Sign-out and optionally reauthanticate.
   * @param reauthenticate
   */
  signout(reauthenticate=true) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({
        // Don't force login if already expired.
        interactive: false
      }, accessToken => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError);
        }

        // Already expired.
        if (!accessToken) {
          resolve();
        } else {
          // Remove cached token if present.
          // https://developer.chrome.com/apps/identity#method-removeCachedAuthToken
          logger.log('Removing cached token...');
          chrome.identity.removeCachedAuthToken({ token: accessToken }, () => {
            if (chrome.runtime.lastError) {
              throw new Error(chrome.runtime.lastError);
            }

            // https://firebase.google.com/docs/reference/js/firebase.auth
            // Automatically re-authenticates (triggers onAuthStateChanged above).
            logger.log('Signing out...');
            firebase.auth().signOut().then(resolve);
          });
        }
      });
    });
  }

  /**
   * Authenticate the user (based on platform).
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
    logger.log('Authenticating Web app...');

    // NOTE: Triggers state change above.
    // https://firebase.google.com/docs/reference/js/firebase.auth.Auth.html#signInWithPopup
    return firebase.auth().signInWithPopup(this._authProvider)
      .then(result => {
        return firebase.auth().currentUser;
      })
      .catch(error => {
        switch (error.code) {
          case 'auth/popup-blocked': {
            // TODO(burdon): Show user dialog.
          }
        }
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
    logger.log('Authenticating CRX app...');

    return new Promise((resolve, reject) => {

      // TODO(burdon): "For a good user experience..."
      // https://developer.chrome.com/apps/identity#method-getAuthToken

      // NOTE: The OAuth2 token uses the scopes defined in the manifest (can be overridden below).
      // NOTE: Can only be accessed from the background page.
      // NOTE: This hangs if the manifest's oauth2 client_id is wrong (e.g., prod vs. dev).
      // https://developer.chrome.com/apps/app_identity
      // https://developer.chrome.com/apps/identity#method-getAuthToken
      // ERROR: OAuth2 request failed: Service responded with error: 'bad client id: UNSUPPORTED'
      // => OAuth2 Credentials don't match CRX ID (must be Type: Chrome App).
      chrome.identity.getAuthToken({

        // Open Google login page if token has expired; if false, then fail.
        interactive: true,

        // Scopes matching the manifest.
        scopes: GoogleApiConfig.authScopes

      }, accessToken => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError);
        }

        // Troubleshooting:
        // Error: signInWithCredential => INVALID_REQUEST_URI
        // https://github.com/firebase/quickstart-js/issues/98 [burdon 1/25/17]
        // FB says Chrome auth isn't supported (email to me 1/25/17 and old support thread 6/22/16):
        // http://stackoverflow.com/questions/37865434/firebase-auth-with-facebook-oauth-credential-from-google-extension
        // But:
        // https://github.com/firebase/quickstart-js/tree/master/auth/chromextension
        // https://groups.google.com/forum/#!msg/firebase-talk/HgntKvXHEcY/vu6dCgbuGwAJ (demo)
        // https://chrome.google.com/webstore/detail/firebase-auth-in-chrome-e/lpgchdfbjddonaolofeijjackhnhnlla/related
        // > Ensure Chrome App OAuth Client
        // > Client ID to manifest
        // > Add published extension key to manifest
        // > Add Google OAuth Client ID to Firebase Google Auth whitelist
        // https://console.developers.google.com/apis/credentials?project=minder-beta
        // https://console.firebase.google.com/project/minder-beta/authentication/providers

        // Get Google-specific credentials.
        // https://firebase.google.com/docs/reference/js/firebase.auth.GoogleAuthProvider
        let credential = firebase.auth.GoogleAuthProvider.credential(null, accessToken);

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

            // TODO(burdon): Hangs if user closes Login page?
            reject(error);
          });
      });
    });
  }
}

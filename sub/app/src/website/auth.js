//
// Copyright 2016 Minder Labs.
//

import Cookies from 'js-cookie';
import * as firebase from 'firebase';

import { Const, FirebaseAppConfig, GoogleApiConfig } from '../common/defs';

/**
 * Auth module.
 * NOTE: This could become the app loader.
 */
export class Auth {

  constructor() {
    firebase.initializeApp(FirebaseAppConfig);

    // https://firebase.google.com/docs/auth/web/google-signin
    this._provider = new firebase.auth.GoogleAuthProvider();

    // Google default scopes.
    // https://myaccount.google.com/permissions
    _.each(GoogleApiConfig.authScopes, scope => {
      this._provider.addScope(scope);
    });
  }

  /**
   * Login via Firebase.
   * @returns {Promise}
   */
  login() {
    console.log('OAuth Login');

    // Redirect and get user credentials.
    // https://firebase.google.com/docs/reference/js/firebase.auth.Auth#getRedirectResult
    return firebase.auth().getRedirectResult()
      .then(result => {
        let { user, credential } = result;
        if (!user) {
          // Redirect to Google if token has expired (results obtained by getRedirectResult above).
          // https://firebase.google.com/docs/reference/js/firebase.auth.Auth#signInWithRedirect
          return firebase.auth().signInWithRedirect(this._provider);
        }

        // Get the JWT.
        // Returns the current token or issues a new one if expire (short lived; lasts for about an hour).
        // https://firebase.google.com/docs/reference/js/firebase.User#getToken
        return user.getToken()
          .then(jwt => {

            // TODO(burdon): Get the long lived refresh token?
            // https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them

            // TODO(burdon): authManager.getUserInfoFromCookie (how to get server side auth?)
            // Se the auth cookie for server-side detection.
            // https://github.com/js-cookie/js-cookie
            Cookies.set(Const.AUTH_COOKIE, jwt, {
              domain: window.location.hostname,
              expires: 1, // 1 day.
            });

            // Register the user.
            return this.registerUser(user, credential)
              .then(user => {
                return user;
              });
          });
      })
      .catch(error => {
        console.error(error);
      });
  }

  /**
   * Logout Firebase app.
   * @returns {Promise}
   */
  logout() {
    console.log('OAuth Logout');

    // https://firebase.google.com/docs/auth/web/google-signin
    return firebase.auth().signOut()
      .then(() => {
        // Remove the cookie.
        Cookies.remove(Const.AUTH_COOKIE);
      }, error => {
        console.error(error);
      });
  }

  /**
   * Upsers the logged in user to create a user record.
   *
   * @param user
   * @param credential
   * @returns {Promise}
   */
  registerUser(user, credential) {
    return new Promise((resolve, reject) => {
      console.log('Registering user: ' + user.email);

      $.ajax({
        url: '/user/register',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
          user,
          credential
        }),

        success: response => {
          let { user } = response;
          console.log('Registered user: %s', JSON.stringify(_.pick(user, ['id', 'title', 'email'])));
          resolve(user)
        },

        error: error => {
          reject(error);
        }
      });
    });
  }
}

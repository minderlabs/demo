//
// Copyright 2016 Minder Labs.
//

import Cookies from 'js-cookie';
import * as firebase from 'firebase';

import { Const, FirebaseConfig, GoogleApiConfig } from '../common/defs';

/**
 * Auth module.
 * NOTE: This could become the app loader.
 */
export class Auth {

  // TODO(burdon): Enable offline.

  constructor() {
    firebase.initializeApp(FirebaseConfig);

    // https://firebase.google.com/docs/auth/web/google-signin
    this._provider = new firebase.auth.GoogleAuthProvider();
    _.each(GoogleApiConfig.authScopes, scope => { this._provider.addScope(scope); });
  }

  /**
   * Login via Firebase.
   * @param path
   */
  login(path) {
    console.log('OAuth Login');

    // TODO(burdon): Document.
    // Access Token: Determine authorization (short-lived).
    // Refresh Token: Get new Access Token.

    // TODO(burdon): Expiration? Getting JWT isn't complete?
    // https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/

    // NOTE: Always flows through here (first then after redirect).
    firebase.auth().getRedirectResult()
      .then(result => {

        // TODO(burdon): Store Google Access Token.
        if (result.credential) {
          let token = result.credential.accessToken;
          console.log('Access Token: %s', token);
        }

        // The signed-in user info.
        let user = result.user;
        if (user) {
          // https://firebase.google.com/docs/reference/js/firebase.User#getToken
          user.getToken().then(token => {
            this.registerUser(result).then(() => {

              // TODO(burdon): Do we need this?
              // Se the auth cookie for server-side detection.
              // https://github.com/js-cookie/js-cookie
              Cookies.set(Const.AUTH_COOKIE, token, {
//              path: '/',
                domain: window.location.hostname,
                expires: 1,       // 1 day.
//              secure: true      // If served over HTTPS.
              });

              // Redirect.
              window.location.href = path;
            });
          });
        } else {
          // Calls above.
          firebase.auth().signInWithRedirect(this._provider);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }

  /**
   * Logout Firebase app.
   * @param path
   */
  logout(path) {
    console.log('OAuth Logout');

    // https://firebase.google.com/docs/auth/web/google-signin
    firebase.auth().signOut().then(
      function() {
        // Remove the cookie.
        Cookies.remove(Const.AUTH_COOKIE);

        // Redirect.
        window.location.href = path;
      },
      function(error) {
        console.error(error);
      });
  }

  /**
   * Upsers the logged in user to create a user record.
   *
   * @param result
   * @returns {Promise}
   */
  registerUser(result) {
    return new Promise((resolve, reject) => {
      let { credential, user } = result;
      let { accessToken, idToken, provider } = credential;
      let { uid, email, displayName:name } = user;

      $.ajax({
        url: '/user/register',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
          credential: {
            accessToken, idToken, provider,
          },
          user: {
            uid, email, name
          }
        }),

        success: (response) => {
          console.log('Registered user: [%s] %s', uid, email);
          resolve()
        },

        error: (error) => {
          console.error(error);
        }
      });
    });
  }
}

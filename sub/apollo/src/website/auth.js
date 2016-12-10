//
// Copyright 2016 Minder Labs.
//

'use strict';

import Cookies from 'js-cookie';
import * as firebase from 'firebase';

import { FirebaseConfig } from '../common/defs';

const COOKIE = 'minder_auth_token';

/**
 * Auth module.
 * NOTE: This could become the app loader.
 */
export class Auth {

  constructor() {
    firebase.initializeApp(FirebaseConfig);

    // https://firebase.google.com/docs/auth/web/google-signin
    this._provider = new firebase.auth.GoogleAuthProvider();
    this._provider.addScope('https://www.googleapis.com/auth/plus.login');
  }

  /**
   * Login via Firebase.
   * @param path
   */
  login(path) {
    console.log('LOGIN');

    // NOTE: Always flows through here (first then after redirect).
    firebase.auth().getRedirectResult()
      .then((result) => {

        // The signed-in user info.
        let user = result.user;
        if (user) {
          user.getToken().then(token => {
            this.registerUser(result).then(() => {

              // TODO(burdon): Do we need this?
              // Se the auth cookie for server-side detection.
              // https://github.com/js-cookie/js-cookie
              Cookies.set(COOKIE, token, {
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
        console.log('ERROR', error);
      });
  }

  /**
   * Logout Firebase app.
   * @param path
   */
  logout(path) {
    console.log('LOGOUT');

    // https://firebase.google.com/docs/auth/web/google-signin
    firebase.auth().signOut().then(
      function() {
        // Remove the cookie.
        Cookies.remove(COOKIE);

        // Redirect.
        window.location.href = path;
      },
      function(error) {
        console.log('ERROR', error);
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
          console.log('ERROR', error);
        }
      });
    });
  }
}
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

  // TODO(burdon): Send email on first login?
  // https://firebase.google.com/docs/auth/web/manage-users#send_a_user_a_verification_email

  constructor() {
    firebase.initializeApp(FirebaseAppConfig);

    // https://firebase.google.com/docs/auth/web/google-signin
    this._provider = new firebase.auth.GoogleAuthProvider();

    // Google default scopes.
    // TODO(burdon): Get scopes from registry.
    // https://myaccount.google.com/permissions
    _.each(GoogleApiConfig.authScopes, scope => {
      this._provider.addScope(scope);
    });
  }

  /**
   * Login via Firebase.
   *
   * Firebase issues a JWT once the user is authenticated and uses a Provider (e.g., Google) to actually
   * perform the authentication and return OAuth credentials (for the requested scopes).
   *
   * The JWT is passed as a header by the client on all network requests. The JWT is short-lived (1 hour),
   * so the client uses auth().getToken() on each network request -- and the token is seamlessly refreshed
   * when it has expired.
   *
   * Additionally, we set a cookie so that our frontend server can recognize authenticated users.
   *
   * @returns {Promise}
   */
  login() {
    return new Promise((resolve, reject) => {

      // Check if already logged in.
      // https://firebase.google.com/docs/auth/web/manage-users#get_the_currently_signed-in_user
      firebase.auth().onAuthStateChanged(userInfo => {
        if (userInfo) {

          // Get the JWT.
          // Returns the current token or issues a new one if expire (short lived; lasts for about an hour).
          // https://firebase.google.com/docs/reference/js/firebase.User#getToken
          return userInfo.getToken()
            .then(jwt => {

              // We're now authenticated, but need to register or check we are active.
              // https://firebase.google.com/docs/reference/js/firebase.auth.Auth#getRedirectResult
              return firebase.auth().getRedirectResult().then(result => {
                let { credential } = result;

                // Credential is null if we've already been authenticated.
                return this.registerUser(userInfo, credential).then(user => {

                  // Set the auth cookie for server-side detection via AuthManager.getUserFromCookie().
                  // https://github.com/js-cookie/js-cookie
                  if (user.active) {
                    Cookies.set(Const.AUTH_COOKIE, jwt, {
                      domain: window.location.hostname,
                      expires: 1, // 1 day.
                    });
                  }

                  resolve(user);
                });
              });
            });
        } else {

          // Redirect to Google if token has expired (results obtained by getRedirectResult above).
          // https://firebase.google.com/docs/reference/js/firebase.auth.Auth#signInWithRedirect
          console.log('Redirecting to OAuth provider: ' + this._provider.providerId);
          return firebase.auth().signInWithRedirect(this._provider);
        }
      });
    });
  }

  /**
   * Logout Firebase app.
   * @returns {Promise}
   */
  logout() {
    console.log('Logging out...');

    // Logout and remove the cookie.
    // https://firebase.google.com/docs/auth/web/google-signin
    return firebase.auth().signOut().then(() => {
      Cookies.remove(Const.AUTH_COOKIE);
    });
  }

  /**
   * Registers the user's credential if logged in by the provider or looks up an existing user.
   *
   * @param userInfo Firebase user record.
   * @param credential
   * @returns {Promise}
   */
  registerUser(userInfo, credential=undefined) {
    return new Promise((resolve, reject) => {
      console.log('Registering user: ' + userInfo.email);

      $.ajax({
        url: '/user/register',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
          userInfo,
          credential
        }),

        success: response => {
          let { user } = response;
          console.log('Registered user: %s', JSON.stringify(_.pick(user, ['id', 'title', 'email', 'active'])));
          resolve(user)
        },

        error: error => {
          reject(error);
        }
      });
    });
  }
}

//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import google from 'googleapis';

import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';

import { Logger, SystemStore } from 'minder-core';

import { OAuthProvider } from '../../auth/oauth';

const logger = Logger.get('oauth.google');

/**
 * Google.
 *
 * https://developers.google.com/identity/protocols/OAuth2WebServer
 *
 * ### Node ###
 * Officially "supported" Node ("google") librarys:
 * https://github.com/google/google-api-nodejs-client
 * http://google.github.io/google-api-nodejs-client/18.0.0/index.html
 *
 * ### Web Client ###
 * Vs. Completely separate set of Web Client ("gapi") library:
 * https://developers.google.com/api-client-library/javascript/features/authentication
 * https://developers.google.com/api-client-library/javascript/reference/referencedocs
 *
 * ### Testing ###
 * chrome://identity-internals (revoke auth)>.
 * https://myaccount.google.com/permissions (revoke app permissions).
 * https://www.googleapis.com/oauth2/v1/tokeninfo?{id_token|access_token}=XXX (validate token).
 */
export class GoogleOAuthProvider extends OAuthProvider {

  // https://developers.google.com/identity/protocols/googlescopes
  static SCOPES = [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  constructor(config, scope=GoogleOAuthProvider.SCOPES, testing) {
    super();

    // Contains OAuth registration.
    this._config = config;

    // https://console.developers.google.com/apis/credentials?project=minder-beta
    this._oauthCallbackUrl = (testing ? OAuthProvider.OAUTH_TESTING_CALLBACK : OAuthProvider.OAUTH_CALLBACK) +
      SystemStore.sanitizeKey(this.providerId);
  }

  // TODO(burdon): Use in services.
  createClient(credentials=undefined) {

    // TODO(burdon): Get Const from config.
    // https://github.com/google/google-api-nodejs-client/#oauth2-client
    // https://github.com/google/google-api-nodejs-client/blob/master/apis/oauth2/v2.js
    let oauthClient = new google.auth.OAuth2(
      this._config.clientId,
      this._config.clientSecret
    );

    if (credentials) {
      oauthClient.setCredentials(_.pick(credentials, ['access_token', 'refresh_token']));
    }

    return oauthClient;
  }

  get providerId() {
    return 'google';
  }

  get html() {
    // https://developers.google.com/identity/branding-guidelines
    return (
      '<a href="' + this._oauthCallbackUrl + '">' +
        '<img alt="Google Login" src="https://developers.google.com/identity/images/btn_google_signin_dark_normal_web.png">' +
      '</a>'
    );
  }

  createStrategy(loginCallback) {

    // http://passportjs.org/docs/google
    // https://github.com/jaredhanson/passport-google-oauth
    // https://github.com/jaredhanson/passport-google-oauth2
    return new GoogleStrategy({
      clientID:       this._config.clientId,
      clientSecret:   this._config.clientSecret,
      callbackURL:    this._oauthCallbackUrl
    }, loginCallback)
  }

  /**
   * Testing:
   * https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=XXX
   */
  verifyIdToken(idToken) {
    console.assert(idToken);

    return new Promise((resolve, reject) => {
      let oauthClient = this.createClient();

      // https://developers.google.com/identity/sign-in/web/backend-auth
      // https://developers.google.com/identity/protocols/OpenIDConnect#obtaininguserprofileinformation
      oauthClient.verifyIdToken(idToken, this._config.clientId, (error, response) => {
        if (error) {
          console.error('Invalid id_token: ' + idToken);
          throw new Error(error);
        }

        let { iss, aud: clientId, sub: id, email, email_verified } = response.getPayload();
        console.assert(iss === 'accounts.google.com');
        console.assert(clientId === this._config.clientId);
        console.assert(email_verified);

        let tokenInfo = { id, email };
        logger.log('Decoded id_token:', JSON.stringify(tokenInfo));
        resolve(tokenInfo);
      });
    });
  }

  getUserProfile(credentials) {
    console.assert(credentials);

    return new Promise((resolve, reject) => {
      let oauthClient = this.createClient(credentials);

      // TODO(burdon): Factor out.
      let plus = google.plus('v1');
      plus.people.get({
        userId: 'me',
        auth: oauthClient
      }, (error, profile) => {
        if (error) {
          throw new Error(error);
        }

        resolve(OAuthProvider.getCanonicalUserProfile(profile));
      });
    });
  }

  revokeCredentials(credentials) {
    return new Promise((resolve, reject) => {
      let oauthClient = this.createClient(credentials);

      // TODO(burdon): Not testing. Document.
      oauthClient.revokeCredentials((error, result) => {
        if (error) {
          throw new Error(error);
        }

        resolve();
      });
    });
  }
}

//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import google from 'googleapis';

import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';

import { Logger, HttpError, SystemStore } from 'minder-core';

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

  // TODO(burdon): Update credentials when access_token updated by refresh_token.
  // TODO(burdon): Remove FB OAuth config (incl. server OAuth registration from FB and Google consoles).

  // https://developers.google.com/identity/protocols/googlescopes
  static SCOPES = [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/userinfo.email',

    // TODO(burdon): Move to service defs.
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  constructor(config, scope=GoogleOAuthProvider.SCOPES, testing) {
    super();

    // Contains OAuth registration.
    this._config = config;

    // https://console.developers.google.com/apis/credentials?project=minder-beta
    this._callbackUrl = (testing ? OAuthProvider.OAUTH_TESTING_CALLBACK : OAuthProvider.OAUTH_CALLBACK) +
      SystemStore.sanitizeKey(this.providerId);

    // TODO(burdon): Implement revoke.
    // https://developers.google.com/identity/protocols/OAuth2UserAgent#tokenrevoke

    // TODO(burdon): See "prompt" argument.
    // https://developers.google.com/identity/protocols/OAuth2WebServer#redirecting

    // TODO(burdon): Move to service.
    // TODO(burdon): Use passport directly?
    // NOTE: The refresh_token is only returned when it is FIRST REQUESTED.
    // We need to unregister offline access then re-request it to obtain the token.
    // This can be done manually via: https://myaccount.google.com/permissions
    // https://github.com/google/google-api-nodejs-client
    this._oauthCallbackUrl = this.createClient(null, this._callbackUrl).generateAuthUrl({
      access_type: 'offline',
      scope: GoogleOAuthProvider.SCOPES
    });
  }

  /**
   *
   * @param credentials
   * @param callback
   * @return {google.auth.OAuth2}
   */
  // TODO(burdon): Use in services.
  createClient(credentials=undefined, callback=undefined) {

    // TODO(burdon): Get Const from config.
    // https://github.com/google/google-api-nodejs-client/#oauth2-client
    // https://github.com/google/google-api-nodejs-client/blob/master/apis/oauth2/v2.js
    let oauthClient = new google.auth.OAuth2(
      this._config.clientId,
      this._config.clientSecret,
      callback
    );

    if (credentials) {
      oauthClient.setCredentials(_.pick(credentials, ['access_token', 'refresh_token']));
    }

    return oauthClient;
  }

  get providerId() {
    return 'google';
  }

  createStrategy(loginCallback) {

    // http://passportjs.org/docs/google
    // https://github.com/jaredhanson/passport-google-oauth
    // https://github.com/jaredhanson/passport-google-oauth2
    return new GoogleStrategy({
      clientID:       this._config.clientId,
      clientSecret:   this._config.clientSecret,
      callbackURL:    this._callbackUrl
    }, loginCallback)
  }

  /**
   * Testing:
   * https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=XXX
   */
  verifyIdToken(idToken) {
    console.assert(idToken, 'Invalid token.');

    return new Promise((resolve, reject) => {
      let oauthClient = this.createClient();

      // https://developers.google.com/identity/sign-in/web/backend-auth
      // https://developers.google.com/identity/protocols/OpenIDConnect#obtaininguserprofileinformation
      oauthClient.verifyIdToken(idToken, this._config.clientId, (error, response) => {
        if (error) {
          console.error('Invalid id_token: ' + idToken);
          throw new HttpError(401);
        }

        let { iss, aud: clientId, sub: id, email, email_verified } = response.getPayload();
        console.assert(iss.endsWith('accounts.google.com'), 'Invalid ISS: ' + iss);
        console.assert(clientId === this._config.clientId, 'Invalid client ID: ' + clientId);
        console.assert(email_verified, 'User not verified: ' + email);

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
      // https://developers.google.com/+/web/api/rest
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

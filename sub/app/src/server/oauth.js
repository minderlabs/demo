//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import google from 'googleapis';

import { Logger, SystemStore } from 'minder-core';

import { GoogleApiConfig } from '../common/defs';

const logger = Logger.get('oauth');

/**
 * Router for '/accounts' paths. Root /accounts page iterates over AccountManager.accounts exposing
 * account.signUpButtons() if not already connected, or account.info() if connected.
 *
 * @param userManager
 * @param systemStore
 * @param oauthRegistry
 * @param config
 * @return {*}
 */
export const oauthRouter = (userManager, systemStore, oauthRegistry, config={}) => {
  console.assert(userManager && systemStore && oauthRegistry && config);

  let router = express.Router();

  //
  // OAuth request.
  //
  router.get('/login/:providerId', function(req, res) {
    let { providerId } = req.params;
    let provider = oauthRegistry.getProvider(providerId);
    console.assert(provider, 'Invalid provider: ' + providerId);
    logger.log('Redirecting: ' + provider.requestUrl);
    res.redirect(provider.requestUrl);
  });

  //
  // OAuth callback.
  //
  router.get('/callback/:providerId', function(req, res, next) {
    let { providerId } = req.params;
    logger.log('Callback: ' + providerId);
    let provider = oauthRegistry.getProvider(providerId);

    // TODO(burdon): Handle errors.
    provider.processResponse(req, res).then(response => {
      let { userInfo, credential } = response;
      logger.log('Authenticated:', JSON.stringify(userInfo));

      // TODO(burdon): Google ID is different from the FB ID! Deprecate FB auth.
      // TODO(burdon): Rename credential => credentials.
      systemStore.getUserByEmail(userInfo.email).then(user => {
        SystemStore.updateUserCredential(user, _.assign(credential, { provider: providerId }));
        systemStore.updateUser(user).then(() => {
          // TODO(burdon): Inject router to redirect.
          res.redirect('/user/profile');
          next();
        });
      });
    });
  });

  return router;
};

/**
 * Registry of OAuth Providers.
 */
export class OAuthRegistry {

  constructor() {
    this._providers = new Map();
  }

  get providers() {
    return _.toArray(this._providers.values());
  }

  getProvider(domain) {
    console.assert(domain);
    return this._providers.get(SystemStore.sanitizeKey(domain));
  }

  registerProvider(provider) {
    console.assert(provider && provider.domain);
    this._providers.set(SystemStore.sanitizeKey(provider.domain), provider);
    return this;
  }
}

/**
 * OAuth Provider.
 */
export class OAuthProvider {

  static PATH = '/oauth';

  // Register callbacks with OAuth providers.
  static OAUTH_CALLBACK = 'https://www.minderlabs.com/oauth/callback/';

  // NOTE: Register "localhost.net" in /etc/hosts for tests (i.e., 127.0.0.1 localhost.net)
  static OAUTH_TESTING_CALLBACK = 'http://localhost.net:3000/oauth/callback/';

  /**
   * Display name for the accounts management page.
   */
  get domain() {
    throw new Error('Not implemented');
  }

  /**
   * Get the OAuth request URL.
   */
  get requestUrl() {
    throw new Error('Not implemented');
  }

  /**
   * Return a block of html for the /accounts management page.
   */
  get html() {
    throw new Error('Not implemented');
  }

  /**
   * Process OAuth callback response.
   * @param req HTTP request.
   * @param res HTTP response.
   * @returns {Promise<{credentials}>} Credentials: https://tools.ietf.org/html/rfc6749#section-1.5
   */
  processResponse(req, res) {
    throw new Error('Not implemented');
  }
}

/**
 * Google.
 *
 * https://developers.google.com/identity/protocols/OAuth2WebServer
 *
 *
 * Officially "supported" Node.js ("google") librarys:
 * https://github.com/google/google-api-nodejs-client
 *
 * Vs. Completely separate set of JS Client ("gapi") library:
 * https://developers.google.com/api-client-library/javascript/features/authentication
 * https://developers.google.com/api-client-library/javascript/reference/referencedocs
 *
 * Testing:
 * https://myaccount.google.com/permissions (revoke app permissions).
 * https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=XXX (test token).
 */
export class GoogleOAuthProvider extends OAuthProvider {

  // https://developers.google.com/identity/protocols/googlescopes
  static SCOPES = [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  constructor(scope=GoogleOAuthProvider.SCOPES) {
    super();

    // TODO(burdon): Pass scope to base class.
    this._scope = scope;
  }

  init(testing=false) {

    // https://console.developers.google.com/apis/credentials?project=minder-beta
    let callback = (testing ? OAuthProvider.OAUTH_TESTING_CALLBACK : OAuthProvider.OAUTH_CALLBACK) +
      SystemStore.sanitizeKey(this.domain);

    // TODO(burdon): Factor out (and pass in) client with setCredentials method below (for use in subsequent API calls).
    // https://github.com/google/google-api-nodejs-client/#oauth2-client
    this._oauth2Client = new google.auth.OAuth2(
      GoogleApiConfig.clientId,
      GoogleApiConfig.clientSecret,
      callback
    );

    // TODO(burdon): Implement revoke.
    // https://developers.google.com/identity/protocols/OAuth2UserAgent#tokenrevoke

    // TODO(burdon): See "prompt" argument.
    // https://developers.google.com/identity/protocols/OAuth2WebServer#redirecting

    // NOTE: The refresh_token is only returned when it is FIRST REQUESTED.
    // We need to unregister offline access then re-request it to obtain the token.
    // This can be done manually via: https://myaccount.google.com/permissions
    this._requestUrl = this._oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this._scope
    });

    return this;
  }

  get domain() {
    return 'google.com';
  }

  get requestUrl() {
    return this._requestUrl;
  }

  get html() {
    // https://developers.google.com/identity/branding-guidelines
    return (
      '<a href="' + this.requestUrl + '">' +
        '<img alt="Google Login" src="https://developers.google.com/identity/images/btn_google_signin_dark_normal_web.png">' +
      '</a>'
    );
  }

  /**
   * https://developers.google.com/identity/protocols/OAuth2WebServer#handlingresponse
   */
  processResponse(req, res) {
    return new Promise((resolve, reject) => {
      let { code, error } = req.query;
      if (error) {
        throw new Error(error);
      }

      this._oauth2Client.getToken(code, (error, credential) => {
        if (error) {
          throw new Error(error);
        }

        // TODO(burdon): Extract and use in all API calls.
        this._oauth2Client.setCredentials(_.pick(credential, ['access_token', 'refresh_token']));

        // Enable API in console (then wait "a few" Google minutes).
        let plus = google.plus('v1');
        plus.people.get({
          userId: 'me',
          auth: this._oauth2Client
        }, (error, response) => {
          if (error) {
            throw new Error(error);
          }

//        console.log('User Info:', JSON.stringify(response, 0, 2));

          // TODO(burdon): Normalize userInfo across other OAuth services.
          let userInfo = {
            id: response.id,
            name: response.displayName,
            email: _.get(_.find(response.emails, email => email.type === 'account'), 'value'),
            imageUrl: _.get(response, 'image.url'),
          };

          resolve({ userInfo, credential });
        });
      });
    });
  }
}

/**
 * Slack.
 */
export class SlackOAuthProvider extends OAuthProvider {

  get domain() {
    return 'slack.com';
  }

  get requestUrl() {
    return '/botkit/login';
  }

  get html() {
    return (
      '<a href="' + this.requestUrl + '">' +
        '<img alt="Add to Slack" height=40 width="139" src="https://platform.slack-edge.com/img/add_to_slack.png">' +
      '</a>'
    );
  }
}

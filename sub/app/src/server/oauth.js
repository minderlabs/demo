//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import bodyParser from 'body-parser';
import express from 'express';
import google from 'googleapis';

import { GoogleApiConfig } from '../common/defs';

// Sign-up buttons can start OAuth flow that redirects back to /accounts/<service>, which delegates to the
// service handler. After creating accounts (systemStore?) and getting credentials from the service and
// storing them in the UserStore, the handler can redirect back to /accounts.

/**
 * Router for '/accounts' paths. Root /accounts page iterates over AccountManager.accounts exposing
 * account.signUpButtons() if not already connected, or account.info() if connected.
 *
 * @param oauthRegistry
 * @return {*}
 */
export const oauthRouter = (oauthRegistry) => {
  console.assert(oauthRegistry);

  let router = express.Router();

  router.use(bodyParser.json());

  // OAuth request.
  router.use('/login/:provider', function(req, res) {
    let provider = oauthRegistry.getProvider(req.params.provider);
    res.redirect(provider.requestUrl);
  });

  // OAuth callback.
  // (see framework's oauth_blueprint.py).
  router.use('/callback/:provider', function(req, res) {
    let provider = oauthRegistry.getProvider(req.params.provider);

    // TODO(burdon): Store tokens.
    // TODO(burdon): Handle errors.
    provider.processResponse(req, res);

    // TODO(burdon): Inject router to redirect.
    res.redirect('/');
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
    return this._providers.get(domain);
  }

  registerProvider(provider) {
    console.assert(provider && provider.domain);
    this._providers.set(provider.domain, provider);
    return this;
  }
}

/**
 * OAuth Provider.
 */
export class OAuthProvider {

  static PATH = '/oauth';

  // NOTE: Register "localhost.net" in /etc/hosts for tests.
  // 127.0.0.1 localhost.net
//static OAUTH_CALLBACK = 'https://www.minderlabs.com/oauth/callback/';
  static OAUTH_CALLBACK = 'http://localhost.net:3000/oauth/callback/';

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
   * Process OAuth response.
   * @param req HTTP request.
   * @param res HTTP response.
   */
  processResponse(req, res) {
    throw new Error('Not implemented');
  }
}

/**
 * Google.
 *
 * https://github.com/google/google-api-nodejs-client/#oauth2-client
 * https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=XXX (test token).
 * https://myaccount.google.com/permissions (user permissions).
 */
export class GoogleOAuthProvider extends OAuthProvider {

  static SCOPES = [
    'https://www.googleapis.com/auth/plus.me'
  ];

  constructor(scopes=[]) {
    super();

    let OAuth2 = google.auth.OAuth2;

    // Register callback.
    // https://github.com/google/google-api-nodejs-client/#oauth2-client
    // https://developers.google.com/identity/protocols/OAuth2WebServer
    this._oauth2Client = new OAuth2(
      GoogleApiConfig.clientId,
      GoogleApiConfig.clientSecret,

      // https://console.developers.google.com/apis/credentials?project=minder-beta
      OAuthProvider.OAUTH_CALLBACK + this.domain
    );

    this._requestUrl = this._oauth2Client.generateAuthUrl({
      scope: GoogleOAuthProvider.SCOPES,

      access_type: 'offline',

      // Optional property that passes state parameters to redirect URI.
      state: {}
    });
  }

  // TODO(burdon): Reconcile with "credentials.google_com" in FB datastore.
  get domain() {
    return 'google';
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

  processResponse(req, res) {
    // https://developers.google.com/identity/protocols/OAuth2WebServer#handlingresponse
    let { code, error } = req.query;
    if (error) {
      throw new Error(error);
    }

    this._oauth2Client.getToken(code, (err, tokens) => {
      if (err) {
        throw new Error(err);
      }

      // TODO(burdon): Implement revoke.
      // NOTE: The refresh_token is only returned when it is first requested.
      // We need to unregister offline access then re-request it to obtain the token.
      // This can be done manually via: https://myaccount.google.com/permissions
      // TODO(burdon): See "prompt" argument.
      // https://developers.google.com/identity/protocols/OAuth2WebServer#redirecting
      return _.pick(tokens, ['access_token', 'id_token', 'refresh_token', 'token_type', 'expiry_date']);
    });
  }
}

/**
 * Slack.
 */
export class SlackOAuthProvider extends OAuthProvider {

  get domain() {
    return 'slack';
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

//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import google from 'googleapis';

import passport from 'passport';
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';

import { Logger, SystemStore } from 'minder-core';

const logger = Logger.get('oauth');

// TODO(burdon): Move to minder-service (server only).

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






  // TODO(burdon): Test CRX login flow (and register). And onSigninChanged.
  // TODO(burdon): id_token (chrome.identity.launchWebAuthFlow)
  // http://stackoverflow.com/questions/26256179/is-it-possible-to-get-an-id-token-with-chrome-app-indentity-api


  // TODO(burdon): JwtStrategy: https://jonathanmh.com/express-passport-json-web-token-jwt-authentication-beginners
  // TODO(burdon): Session store: https://github.com/expressjs/session#compatible-session-stores
  //               https://www.npmjs.com/package/connect-redis
  //               https://www.npmjs.com/package/connect-memcached
  // TODO(burdon): Remove website/login and AUTH_COOKIE. (Test and doc if uses Google cookie "_ga"; see source).
  // TODO(burdon): Register user in callback.
  // TODO(burdon): Move to User (login/logout). Use passport for all OAuth.

  router.use(passport.initialize());
  router.use(passport.session());

  passport.serializeUser((user, done) => {
    console.log('>>>>>>>>>>>>>', user);
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    console.log('<<<<<<<<<<<<<<<', user);
    done(null, user);
  });

  // http://passportjs.org/docs/google
  // https://github.com/jaredhanson/passport-google-oauth
  // https://github.com/jaredhanson/passport-google-oauth2
  passport.use(new GoogleStrategy({
    clientID: '189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com',
    clientSecret: 'WZypHT09Z8Fy8NHVKY3qmMFt',
    callbackURL: 'http://localhost.net:3000/oauth/callback/google_com'
  }, (accessToken, refreshToken, params, profile, done) => {

    let { id_token, token_type, expires_in } = params;

    // http://passportjs.org/docs/profile
    let { id, displayName } = profile;

    let credentials = {
      provider: 'google.com',
      id,
      id_token,                           // JWT
      access_token: accessToken,
      refresh_token: refreshToken,        // NOTE: Only provided when first requested.
      token_type,
      expires_in                          // Access token expiration.
    };

    console.log('OAuth', JSON.stringify(credentials, null, 2));
    return done(null, { id });  // TODO(burdon): User object (Factor out serialization).
  }));

  // TODO(burdon): Get refresh_token ("offline").
  // https://github.com/jaredhanson/passport/issues/42
  router.use('/login/google_com', passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login'],
    accessType: 'offline',
    approvalPrompt: 'force'
  }));

  router.use('/callback/google_com', passport.authenticate('google', {
    failureRedirect: '/error'
  }), (req, res) => {
    res.redirect('/oauth/test');
  });

  // TODO(burdon): Factor out.
  // TODO(burdon): Admin version.
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }

    res.status(401).end();
  };

  router.use('/test', isAuthenticated, (req, res) => {
    res.send('OK: ' + JSON.stringify(req.user));
  });







  //
  // OAuth request.
  //
  if (false)
  router.get('/login/:providerId', function(req, res) {
    let { providerId } = req.params;
    let provider = oauthRegistry.getProvider(providerId);
    console.assert(provider, 'Invalid provider: ' + providerId);

    logger.log('Login: ' + provider.requestUrl);
    res.redirect(provider.requestUrl);
  });

  //
  // OAuth callback.
  //
  if (false)
  router.get('/callback/:providerId', function(req, res, next) {
    let { providerId } = req.params;
    logger.log('Callback: ' + providerId);
    let provider = oauthRegistry.getProvider(providerId);

    // TODO(burdon): Handle errors.
    provider.processResponse(req, res).then(response => {
      let { userInfo, credential, scope } = response;
      logger.log('Authenticated:', JSON.stringify(userInfo));

      // TODO(burdon): Register user.
      // TODO(burdon): Google ID is different from the FB ID! Deprecate FB auth.
      // TODO(burdon): Rename credential => credentials.
      systemStore.getUserByEmail(userInfo.email).then(user => {

        SystemStore.updateUserCredential(user, _.assign(credential, {
          provider: providerId,
          id: userInfo.id,
          scope
        }));

        systemStore.updateUser(user).then(() => {
          // TODO(burdon): Inject router to redirect.
          res.redirect('/user/profile');
          next();
        });
      });
    });
  });

  //
  // Oauth logout.
  //
  // router.get('/logout/:providerId', function(req, res, next) {
  //   let { providerId } = req.params;
  //   logger.log('Logout: ' + providerId);
  //   let provider = oauthRegistry.getProvider(providerId);
  //
  //   provider.revoke().then(() => {
  //     next();
  //   });
  // });

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

  // TODO(burdon): Consider using passport for non-google providers?
  // http://passportjs.org/docs/google

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
   * For Login providers, validate the JWT.
   * @param token
   */
  // TODO(burdon): Factor out LoginProvider.
  validateJWT(token) {
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

  constructor(config, scope=GoogleOAuthProvider.SCOPES) {
    super();

    this._config = config;

    // TODO(burdon): Scopes should be dynamic (from service registry).
    this._scope = scope;
  }

  init(testing=false) {

    // https://console.developers.google.com/apis/credentials?project=minder-beta
    let callback = (testing ? OAuthProvider.OAUTH_TESTING_CALLBACK : OAuthProvider.OAUTH_CALLBACK) +
      SystemStore.sanitizeKey(this.domain);

    // TODO(burdon): Get Const from config.
    // TODO(burdon): Factor out (and pass in) client with setCredentials method below (for use in subsequent API calls).
    // https://github.com/google/google-api-nodejs-client/#oauth2-client
    // https://github.com/google/google-api-nodejs-client/blob/master/apis/oauth2/v2.js
    this._oauth2Client = new google.auth.OAuth2(
      this._config.clientId,
      this._config.clientSecret,
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

      // TODO(burdon): Dynamic from registry.
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
   * Validate and decode the JWT.
   * @param token
   * @return {Promise}
   */
  validateJWT(token) {
    return new Promise((resolve, reject) => {
      // https://developers.google.com/identity/sign-in/web/backend-auth
      this._oauth2Client.verifyIdToken(token, this._config.clientId, (error, response) => {
        if (error) {
          throw new Error(error);
        }

        let { sub:userId, email } = response.getPayload();
        resolve({ userId, email });
      });
    });
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
        // https://github.com/google/google-api-nodejs-client/blob/master/apis/oauth2/v2.js
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

          // TODO(burdon): Normalize userInfo across other OAuth services.
          // https://github.com/google/google-api-nodejs-client/blob/master/apis/oauth2/v2.js
          let userInfo = {
            id: response.id,
            name: response.displayName,
            email: _.get(_.find(response.emails, email => email.type === 'account'), 'value'),
            imageUrl: _.get(response, 'image.url'),
          };

//        console.log('### User Info:', JSON.stringify(response, 0, 2));
          resolve({ userInfo, credential, scope: this._scope });
        });
      });
    });
  }

  // TODO(burdon): Need to create instance of client with credential.
  // revoke() {
  //   return new Promise((resolve, reject) => {
  //     this._oauth2Client.setCredentials(_.pick(credential, ['access_token', 'refresh_token']));
  //     this._oauth2Client.revokeCredentials((error, result) => {
  //       if (error) {
  //         throw new Error(error);
  //       }
  //
  //       resolve();
  //     });
  //   });
  // }
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

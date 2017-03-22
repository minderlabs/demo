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


// TODO(burdon): Use registration idToken in client headers (don't need to authenticate for Web).
// TODO(burdon): Remove FB from client.
// TODO(burdon): Remove FB from server.
// TODO(burdon): Logout/invalidate.

// TODO(burdon): Remove FB config (incl. server OAuth registration from FB and Google consoles).
// TODO(burdon): Only set user as active if joins group (via whitelist).
// TODO(burdon): Clean-up OAuth providers.
// TODO(burdon): Update credentials when access_token updated by refresh_token
// TODO(burdon): graphiql: get token from cookie.
// TODO(burdon): 401 and 500 handling.
// TODO(burdon): Admin group and auth check.


/**
 * Checks if the OAuth cookie has been set by passport.
 */
// TODO(burdon): Admin version.
export const isAuthenticated = (redirect=undefined) => (req, res, next) => {
  if (req.isAuthenticated()) {
    logger.log('Authenticated user: ' + req.user.id);
    next();
  } else {
    if (redirect) {
      res.redirect(redirect);
    } else {
      // TODO(burdon): throw NotAuthenticatedError()?
      res.status(401).end();
    }
  }
};

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

  router.use(passport.initialize());
  router.use(passport.session());

  // TODO(burdon): Session store: https://github.com/expressjs/session#compatible-session-stores
  //               https://www.npmjs.com/package/connect-redis
  //               https://www.npmjs.com/package/connect-memcached

  /**
   * Serialize User Item to session state.
   */
  passport.serializeUser((user, done) => {
//  logger.log('<<<', JSON.stringify(_.pick(user, ['id', 'email'])));
    let { id } = user;
    done(null, { id });
  });

  /**
   * Get session state and retrieve a User Item.
   */
  passport.deserializeUser((userInfo, done) => {
//  logger.log('>>>', JSON.stringify(userInfo));
    let { id } = userInfo;
    userManager.getUserFromId(id).then(user => {
      if (!user) {
        logger.warn('Invalid User ID: ' + id);
      }
      done(null, user);
    });
  });

  /**
   * Called when OAuth login flow completes.
   * TODO(burdon): Cite documentation for callback signature (params is not in the docs).
   *
   * @param accessToken
   * @param refreshToken
   * @param params
   * @param profile
   * @param done
   */
  let loginCallback = (accessToken, refreshToken, params, profile, done) => {
    console.assert(accessToken);

    let { id_token, token_type, expires_in } = params;
    console.assert(id_token && token_type && expires_in);

    let { provider, id } = profile;
    console.assert(provider && id);

    let credentials = {
      provider,
      id,
      id_token,                           // JWT
      access_token: accessToken,
      token_type,
      expires_in                          // Access token expiration.
    };

    // NOTE: Only provided when first requested.
    if (refreshToken) {
      credentials.refresh_token = refreshToken;
    }

    // Get user profile.
    let userProfile = OAuthProvider.getCanonicalUserProfile(profile);

    // Register/update user.
    // TODO(burdon): Checking for and update existing user?
    // TODO(burdon): Catch exceptions: throw 500.
//  logger.log('Credentials', JSON.stringify(credentials, null, 2));
    systemStore.registerUser(userProfile, credentials).then(user => {
      done(null, user);
    });
  };

  // TODO(burdon): Move strategy factory to OAuthProvider.
  // http://passportjs.org/docs/google
  // https://github.com/jaredhanson/passport-google-oauth
  // https://github.com/jaredhanson/passport-google-oauth2
  let strategy = new GoogleStrategy({
    clientID: '189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com',
    clientSecret: 'WZypHT09Z8Fy8NHVKY3qmMFt',
    callbackURL: 'http://localhost.net:3000/oauth/callback/google' // TODO(burdon): Use passport provider const?
  }, loginCallback);

  // TODO(burdon): Register strategies and routes for all oauth providers.
  passport.use(strategy);

  router.use('/login/google', passport.authenticate('google', {
    // TODO(burdon): Get scopes from OAuthProvider.
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    accessType: 'offline',      // TODO(burdon): Only used when requesting services.
    approvalPrompt: 'force'
  }));

  router.use('/callback/google', passport.authenticate('google', {
    failureRedirect: '/error'
  }), (req, res) => {
    logger.log('Logged in: ', JSON.stringify(_.pick(req.user, ['id', 'email'])));

    // TODO(burdon): Profile page (via router).
    res.redirect('/oauth/testing');
  });


  // TODO(burdon): Move to loginRouter.
  router.use('/testing', isAuthenticated(), (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(req.user));
  });

  // TODO(burdon): Logout/invalidate.
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

  getProvider(providerId) {
    console.assert(providerId);
    return this._providers.get(providerId);
  }

  registerProvider(provider) {
    console.assert(provider && provider.providerId);
    this._providers.set(SystemStore.sanitizeKey(provider.providerId), provider);
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
   * Passport provider ID (e.g., "google").
   */
  get providerId() {
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
   * Validates the (JWT) id_token.
   *
   * https://jwt.io/introduction
   * https://jwt.io (Test decoding token).
   *
   * @param token
   */
  // TODO(burdon): Factor out LoginProvider.
  verifyIdToken(idToken) {
    throw new Error('Not implemented');
  }

  /**
   *
   * @param credentials
   */
  getUserProfile(credentials) {
    throw new Error('Not implemented');
  }

  /**
   * Passport normalizes profile. We store an abridged version of this.
   * http://passportjs.org/docs/profile
   * https://github.com/google/google-api-nodejs-client/blob/master/apis/oauth2/v2.js
   *
   * @param userProfile
   * @returns {UserProfile}
   */
  static getCanonicalUserProfile(userProfile) {
    let { id, emails, displayName, imageUrl } = userProfile;
    let email = _.get(_.find(emails, email => email.type === 'account'), 'value');
    return {
      id, email, displayName, imageUrl
    };
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

    // Move client out of provider? Make stateless?
    this._oauth2Client = null;
  }

  init(testing=false) {

    // https://console.developers.google.com/apis/credentials?project=minder-beta
    let callback = (testing ? OAuthProvider.OAUTH_TESTING_CALLBACK : OAuthProvider.OAUTH_CALLBACK) +
      SystemStore.sanitizeKey(this.providerId);

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

  get providerId() {
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

  /**
   * Testing:
   * https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=XXX
   */
  verifyIdToken(idToken) {
    console.assert(idToken);

    return new Promise((resolve, reject) => {
      // https://developers.google.com/identity/sign-in/web/backend-auth
      // https://developers.google.com/identity/protocols/OpenIDConnect#obtaininguserprofileinformation
      this._oauth2Client.verifyIdToken(idToken, this._config.clientId, (error, response) => {
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

      // TODO(burdon): Client factory.
      this._oauth2Client.setCredentials(_.pick(credentials, ['access_token', 'refresh_token']));

      // TODO(burdon): Factor out.
      let plus = google.plus('v1');
      plus.people.get({
        userId: 'me',
        auth: this._oauth2Client
      }, (error, profile) => {
        if (error) {
          throw new Error(error);
        }

        resolve(OAuthProvider.getCanonicalUserProfile(profile));
      });
    });
  }

  // TODO(burdon): Revoke.
  // revoke() {
  //   return new Promise((resolve, reject) => {
  //     this._oauth2Client.setCredentials(_.pick(credentials, ['access_token', 'refresh_token']));
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

  get providerId() {
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

//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import passport from 'passport';

import { Logger, SystemStore } from 'minder-core';

const logger = Logger.get('oauth');


// TODO(burdon): Use registration idToken in client headers (don't need to authenticate for Web).
// TODO(burdon): Remove FB from client.
// TODO(burdon): Remove FB from server.
// TODO(burdon): Logout/invalidate.

// TODO(burdon): Consistent error handling and logging (throw Error with 400, 401, 500, etc. and catch at end).
// TODO(burdon): Remove FB OAuth config (incl. server OAuth registration from FB and Google consoles).
// TODO(burdon): Only set user as active if joins group (via whitelist).
// TODO(burdon): Clean-up OAuth providers.
// TODO(burdon): Update credentials when access_token updated by refresh_token
// TODO(burdon): graphiql: get token from cookie.
// TODO(burdon): 401 and 500 handling.
// TODO(burdon): Admin group and auth check.

// TODO(burdon): Group ID by org?


/**
 * Checks if the OAuth cookie has been set by passport.
 * NOTE: Browser prefetch may call methods twice.
 */
// TODO(burdon): Check is admin.
export const isAuthenticated = (redirect=undefined, admin=false) => (req, res, next) => {
  if (req.isAuthenticated()) {
    logger.log('Authenticated user: ' + req.user.id);
    next();
  } else {
    logger.warn('Not authenticated: ' + req.url);
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

  // Must be global.
  console.assert(config.app);
  config.app.use(passport.initialize());
  config.app.use(passport.session());

  let router = express.Router();

  // TODO(burdon): Session store: https://github.com/expressjs/session#compatible-session-stores
  //               https://www.npmjs.com/package/connect-redis
  //               https://www.npmjs.com/package/connect-memcached

  // TODO(burdon): Cache token in session?

  /**
   * Serialize User Item to session state.
   */
  passport.serializeUser((user, done) => {
//  logger.log('===>> ' + JSON.stringify(_.pick(user, ['id', 'email'])));
    let { id } = user;
    done(null, { id });
  });

  /**
   * Get session state and retrieve a User Item.
   */
  passport.deserializeUser((userInfo, done) => {
//  logger.log('<<=== ' + JSON.stringify(userInfo));
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
    systemStore.registerUser(userProfile, credentials).then(user => {
      logger.log('OAuth callback: ' + JSON.stringify(_.pick(userProfile, ['id', 'email'])));
      done(null, user);
    });
  };

  //
  // Register OAuth strategies.
  //
  _.each(oauthRegistry.providers, provider => {
    logger.log('Registering OAuth Strategy: ' + provider.providerId);

    // TODO(burdon): Document.
    let strategy = provider.createStrategy(loginCallback);
    passport.use(strategy);

    //
    // OAuth login.
    // http://passportjs.org/docs/google
    // TODO(burdon): Google is specific so OAuthProvider should define router.
    //
    router.get('/login/' + provider.providerId, passport.authenticate(provider.providerId, {
      scope: provider.scopes,
      approvalPrompt: 'force'
    }));

    //
    // Registered OAuth request flow callback.
    //
    router.get('/callback/' + provider.providerId, passport.authenticate(provider.providerId, {
      // TODO(burdon): Const.
      failureRedirect: '/home'
    }), (req, res) => {
      logger.log('Logged in: ' + JSON.stringify(_.pick(req.user, ['id', 'email'])));

      // TODO(burdon): Redirect based on context.
      res.redirect('/app');
    });
  });

  //
  // OAuth test.
  //
  router.get('/test', isAuthenticated('/xxx'), (req, res, next) => {
    let user = req.user;
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      user
    }, null, 2));
  });

  //
  // Logout.
  //
  router.get('/logout/:providerId', (req, res, next) => {
    let { providerId } = req.params;
    logger.log('Logout: ' + providerId);

    // TODO(burdon): Logout/invalidate.
    let provider = oauthRegistry.getProvider(providerId);
    provider.revoke().then(() => {
      next();
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

  static PATH = '/oauth';

  // TODO(burdon): Document.
  static DEFAULT_LOGIN_SCOPES = [
    'openid',
    'profile',
    'email'
  ];

  // Register callbacks with OAuth providers.
  static OAUTH_CALLBACK = 'https://www.minderlabs.com/oauth/callback/';

  // NOTE: Define /etc/hosts entry for docker machine.
  static OAUTH_TESTING_CALLBACK = 'http://localhost:3000/oauth/callback/';

  /**
   * Passport normalizes profile. We store an abridged version of this.
   * http://passportjs.org/docs/profile
   * https://github.com/google/google-api-nodejs-client/blob/master/apis/oauth2/v2.js
   * TODO(burdon): Document profile.
   *
   * @param userProfile
   * @returns { id, email, displayName, photoUrl }
   */
  static getCanonicalUserProfile(userProfile) {
    let { id, emails, displayName, photos } = userProfile;
    let email = _.get(_.find(emails, email => email.type === 'account'), 'value');
    let photoUrl = photos && photos[0];
    return {
      id, email, displayName, photoUrl
    };
  }

  /**
   * Login scopes.
   */
  get scopes() {
    return OAuthProvider.DEFAULT_LOGIN_SCOPES;
  }

  /**
   * Passport provider ID (e.g., "google").
   */
  get providerId() {
    throw new Error('Not implemented');
  }

  /**
   * Return a block of html for the /accounts management page.
   */
  get html() {
    throw new Error('Not implemented');
  }

  /**
   * Creates the Passport strategy.
   * http://passportjs.org/docs/google
   *
   * @param loginCallback
   */
  createStrategy(loginCallback) {
    throw new Error('Not implemented');
  }

  /**
   * Validates the (JWT) id_token.
   *
   * https://jwt.io/introduction
   * https://jwt.io (Test decoding token).
   *
   * @param idToken
   */
  verifyIdToken(idToken) {
    throw new Error('Not implemented');
  }

  /**
   * Uses the OAuth API to retrieve the user's profile.
   *
   * @param credentials
   */
  getUserProfile(credentials) {
    throw new Error('Not implemented');
  }

  /**
   * Revokes the OAuth credentials.
   */
  revokeCredentials(credentials) {
    throw new Error('Not implemented');
  }
}

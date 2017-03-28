//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import passport from 'passport';

import { AuthUtil, Logger, HttpError, HttpUtil, SystemStore } from 'minder-core';

const logger = Logger.get('oauth');

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
      throw new HttpError(401);
    }
  }
};

/**
 * Handles OAuth login flow.
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
   * TODO(burdon): Cite documentation for callback signature (params is not in the Passport docs).
   *
   * @param accessToken
   * @param refreshToken
   * @param params
   * @param profile
   * @param done
   */
  let authCallback = (accessToken, refreshToken, params, profile, done) => {
    console.assert(accessToken);

    // TODO(burdon): Check expiration: https://www.npmjs.com/package/jwt-autorefresh
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
    // TODO(burdon): Update scopes.
    // TODO(burdon): Register vs update?
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

    // Register the strategy.
    passport.use(provider.createStrategy(authCallback));

    //
    // OAuth login.
    // @param redirect On success URL.
    // http://passportjs.org/docs/google
    //
    // TODO(burdon): Handle 401.
    router.get('/login/' + provider.providerId, (req, res, next) => {

      // Dynamically configure the response.
      // https://github.com/jaredhanson/passport-google-oauth2/issues/22 [3/27/17]
      const processAuthRequest = passport.authenticate(provider.providerId, {

        // Login scopes.
        scope: provider.scopes,

        // Incremental Auth.
        include_granted_scopes: true,

        // State passed to callback.
        state: OAuthProvider.encodeState({ redirect: req.query.redirect || '/app' })
      });

      return processAuthRequest.call(null, req, res, next);
    });

    //
    // Registered OAuth request flow callback.
    //
    router.get('/callback/' + provider.providerId, passport.authenticate(provider.providerId, {
      failureRedirect: '/home'
    }), (req, res) => {
      logger.log('Logged in: ' + JSON.stringify(_.pick(req.user, ['id', 'email'])));

      // TODO(burdon): Validate state.
      // TODO(burdon): Update list of scopes?
      let state = OAuthProvider.decodeState(req.query.state);
      logger.log('State: ' + JSON.stringify(state));

      res.redirect(_.get(state, 'redirect', '/home'));
    });
  });

  //
  // OAuth test.
  //
  router.get('/test', isAuthenticated('/profile'), (req, res, next) => {
    let user = req.user;
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      user
    }, null, 2));
  });

  //
  // Logout.
  //
  router.get('/logout/:providerId', isAuthenticated('/home'), (req, res, next) => {
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

  // TODO(burdon): Not used.
  static PATH = '/oauth';

  /**
   * Encode the OAuth state param.
   *
   * @param {object }state Redirect Url on successful OAuth.
   *
   * @return {string} Base64 encoded string.
   */
  static encodeState(state={}) {
    // TODO(burdon): State should implement CSRF protection (and be stored in memcache).
    return new Buffer(JSON.stringify(state)).toString('base64');
  }

  static decodeState(state) {
    console.assert(state);
    return JSON.parse(Buffer.from(state, 'base64'));
  }

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
   * @param providerId Provider ID from the Passport strategy (e.g., 'google').
   * @param callbackUrl Registered OAuth callback.
   */
  constructor(providerId, callbackUrl) {
    console.assert(providerId && callbackUrl);
    this._providerId = providerId;
    this._callbackUrl = HttpUtil.joinUrl(callbackUrl, SystemStore.sanitizeKey(providerId));
  }

  /**
   * Passport provider ID.
   */
  get providerId() {
    return this._providerId;
  }

  /**
   * Login scopes.
   */
  get scopes() {
    return AuthUtil.OPENID_LOGIN_SCOPES;
  }

  /**
   *
   * @param scopes
   */
  createAuthUrl(scopes) {
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

//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

import { AuthDefs, Logger, HttpError, HttpUtil, SystemStore } from 'minder-core';

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
 * Requires JWT Auth header to be set.
 */
// TODO(burdon): Handle JWT decoding errors (JwtStrategy.prototype.authenticate)?
export const hasJwtHeader = () => passport.authenticate('jwt', { session: false });

/**
 * Returns the current User's session.
 * @param {User} user
 * @return {{id_token, id_token_exp }}
 */
export const getUserSession = (user) => {
  return user.session;
};

/**
 * Returns the (JWT) id_token from the session state (cached in the User object).
 * @param {User} user
 * @return {string}
 */
export const getIdToken = (user) => {
  let session = getUserSession(user);
  console.assert(session.id_token, 'Invalid token for user: ' + JSON.stringify(_.pick(user, ['id', 'email'])));
  return session.id_token;
};

/**
 * Handles OAuth login flow:
 *
 * /app => /user/login => /oauth/login/google => /oauth/callback/google => /app
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

  //
  // Configure session store.
  // TODO(burdon): Session store: https://github.com/expressjs/session#compatible-session-stores
  //               https://www.npmjs.com/package/connect-redis
  //               https://www.npmjs.com/package/connect-memcached

  /**
   * Serialize User Item to session store.
   */
  passport.serializeUser((user, done) => {
//  logger.log('===>> ' + JSON.stringify(_.pick(user, ['id', 'email', 'session'])));
    done(null, _.pick(user, [ 'id', 'session' ]));
  });

  /**
   * Retrieve User Item given session state.
   * Sets req.user
   */
  passport.deserializeUser((userInfo, done) => {
//  logger.log('<<=== ' + JSON.stringify(userInfo));
    let { id, session } = userInfo;
    userManager.getUserFromId(id).then(user => {
      if (!user) {
        logger.warn('Invalid User ID: ' + id);
      }

      user.session = session;

      done(null, user);
    });
  });

  //
  // Custom JWT Strategy.
  // NOTE: Doesn't use session by default.
  // https://www.npmjs.com/package/passport-jwt
  //

  // TODO(burdon): env
  const MINDER_JWT_SECRET = 'minder-jwt-secret';
  const MINDER_JWT_AUDIENCE = 'minderlabs.com';

  passport.use(new JwtStrategy({

    authScheme:         AuthDefs.JWT_SCHEME,
    jwtFromRequest:     ExtractJwt.fromAuthHeader(),    // 'authorization: JWT xxx'
    secretOrKey:        MINDER_JWT_SECRET,
    audience:           MINDER_JWT_AUDIENCE,

    // TODO(burdon): Implement auth-refresh.
    ignoreExpiration:   true,

    passReqToCallback:  true
  }, (req, payload, done) => {

    let { id } = payload.data;
    userManager.getUserFromId(id).then(user => {
      if (!user) {
        return done('Invalid User ID: ' + id, false);
      }

      done(null, user);
    });
  }));

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

    let { id_token, token_type } = params;
    console.assert(id_token && token_type);

    let { provider, id } = profile;
    console.assert(provider && id);

    let credentials = {
      provider,
      id,
      token_type,
      access_token: accessToken
    };

    // NOTE: Only provided when first requested (unless forced).
    if (refreshToken) {
      credentials.refresh_token = refreshToken;
    }

    // Get user profile.
    let userProfile = OAuthProvider.getCanonicalUserProfile(profile);

    // Register/update user.
    // TODO(burdon): Register vs update?
    systemStore.registerUser(userProfile, credentials).then(user => {
      logger.log('OAuth callback: ' + JSON.stringify(_.pick(userProfile, ['id', 'email'])));

      //
      // Create the custom JWT token.
      // https://www.npmjs.com/package/jsonwebtoken
      //
      let id_token_exp = moment().add(...AuthDefs.JWT_EXPIRATION).unix();
      let idToken = jwt.sign({
        aud: MINDER_JWT_AUDIENCE,
        iat: moment().unix(),
        exp: id_token_exp,
        data: {
          id: user.id
        }
      }, MINDER_JWT_SECRET);

      // Sets the transient User property (which is stored in the session store).
      _.assign(user, {
        session: {
          id_token: idToken,
          id_token_exp
        }
      });

      // Sets req.user.
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

      // Callback state.
      let state = {
        redirect: req.query.redirect || '/app',
        redirectType: req.query.redirectType,
        requestId: req.query.requestId
      };

      // Handle JSONP.
      if (req.query.redirect === 'jsonp') {
        console.assert(req.query.callback);
        state.jsonp_callback = req.query.callback;
      }

      // Dynamically configure the response.
      // https://github.com/jaredhanson/passport-google-oauth2/issues/22 [3/27/17]
      const processAuthRequest = passport.authenticate(provider.providerId, {

        // Login scopes.
        scope: provider.scopes,

        // Incremental Auth.
        include_granted_scopes: true,

        // State passed to callback.
        state: OAuthProvider.encodeState(state)
      });

      return processAuthRequest.call(null, req, res, next);
    });

    //
    // Registered OAuth request flow callback.
    //
    router.get('/callback/' + provider.providerId, passport.authenticate(provider.providerId, {
      failureRedirect: '/home'
    }), (req, res) => {
      let user = req.user;
      logger.log('Logged in: ' + JSON.stringify(_.pick(user, ['id', 'email'])));

      // TODO(burdon): Validate state.
      let state = OAuthProvider.decodeState(req.query.state);
      logger.log('State: ' + JSON.stringify(state));

      // Redirect after successful callback.
      let redirect = _.get(state, 'redirect', '/home');
      let redirectType = _.get(state, 'redirectType');
      let requestId = _.get(state, 'requestId');

      // JSONP callback (see NetUtil).
      if (redirectType === 'jsonp') {
        // https://auth0.com/docs/tokens/refresh-token
        let response = {
          credentials: _.pick(getUserSession(user), ['id_token', 'id_token_exp'])
        };

        // Send script that invokes JSONP callback.
        let jsonp_callback = _.get(state, 'jsonp_callback');
        res.send(`${jsonp_callback}(${JSON.stringify(response)});`);
        return;
      }

      if (redirectType === 'crx') {
        // This isn't a JSON response, it needs to be encoded as URL params. It's easier to flatten the config.
        let response  = _.assign(
          { requestId },

          // credentials
          _.pick(getUserSession(user), ['id_token', 'id_token_exp']),
          // TODO(madadam): Is credentials.provider necessary? Only for /user/register, which is being deprecated.
          { provider: provider.providerId },

          // userProfile
          // TODO(madadam): Factor out with WebAppRouter.
          _.pick(user, ['email', 'displayName', 'photoUrl'])
        );

        redirect = HttpUtil.toUrl(redirect, response);
      }
      res.redirect(redirect);
    });
  });

  //
  // Logout.
  //
  router.get('/logout/:providerId', isAuthenticated('/home'), (req, res, next) => {
    let { providerId } = req.params;
    logger.log('Logout: ' + providerId);

    // NOTE: Doesn't reset cookie (would logout all Google apps).
    // http://passportjs.org/docs/logout
    req.logout();

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
    return AuthDefs.OPENID_LOGIN_SCOPES;
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

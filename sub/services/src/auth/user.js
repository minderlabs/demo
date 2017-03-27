//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';

import { Logger, HttpError, SystemStore } from 'minder-core';

import { isAuthenticated } from './oauth';

const logger = Logger.get('user');

/**
 * Manage authentication.
 */
export class UserManager {

  /**
   * Gets the (JWT) id_token from the request headers.
   *
   * @param headers HTTP request headers.
   * @returns {string} Unverified token or undefined.
   */
  static getIdTokenFromHeaders(headers) {
    console.assert(headers);

    // NOTE: Express headers are lowercase.
    const authHeader = headers['authorization'];
    if (authHeader) {
      console.assert(authHeader);
      let match = authHeader.match(/^Bearer (.+)$/);
      console.assert(match, 'Invalid authorization header: ' + authHeader);
      return match[1];
    }
  }

  /**
   * Creates a valid authorization header.
   * @param idToken
   * @return {string}
   */
  static createIdHeader(idToken) {
    console.assert(idToken, 'Invalid token.');
    return 'Bearer ' + idToken;
  }

  /**
   * @param loginAuthProvider OAuth provider.
   * @param systemStore The system store manages Users and Groups.
   */
  constructor(loginAuthProvider, systemStore) {
    console.assert(loginAuthProvider && systemStore);
    this._loginAuthProvider = loginAuthProvider;
    this._systemStore = systemStore;
  }

  /**
   * Gets the login OAuthProvider.
   *
   * @returns {OAuthProvider}
   */
  get loginAuthProvider() {
    return this._loginAuthProvider;
  }

  /**
   * Returns the id_token for the user (for the default login OAuthProvider).
   *
   * @param user
   * @return {string}
   */
  getIdToken(user) {
    let provider = this._loginAuthProvider.providerId;
    let credentials = _.get(user, `credentials.${SystemStore.sanitizeKey(provider)}`);
    return credentials.id_token;
  }

  /**
   * Gets the User item.
   *
   * @param userId
   * @return {User}
   */
  getUserFromId(userId) {
    return this._systemStore.getUser(userId);
  }

  /**
   * Returns the user associated with the id_token in the request header.
   *
   * @param headers HTTP request headers.
   * @param required If true and no token or no user is found then throws NotAuthenticatedError.
   * @returns {Promise<User>}
   */
  getUserFromHeader(headers, required=false) {
    console.assert(headers);

    // Token set in apollo client's network interface middleware.
    let idToken = UserManager.getIdTokenFromHeaders(headers);
    if (!idToken) {
      if (required) {
        throw new HttpError('Missing authorization header.', 401);
      }

      return Promise.resolve(null);
    }

    // Decode the token.
    return this._loginAuthProvider.verifyIdToken(idToken)
      .then(tokenInfo => {
        let { id } = tokenInfo;
        let userId = SystemStore.createUserId(this._loginAuthProvider.providerId, id);
        return this._systemStore.getUser(userId)
          .then(user => {
            if (!user) {
              throw new HttpError('Invalid User: ' + JSON.stringify(tokenInfo), 401);
            }

            return user;
          });
      });
  }
}

/**
 * Manage user authentication.
 *
 * @param userManager
 * @param oauthRegistry
 * @param systemStore
 * @param options
 * @returns {Router}
 */
export const userRouter = (userManager, oauthRegistry, systemStore, options) => {
  console.assert(userManager && oauthRegistry && systemStore);

  // OAuth provider used for login.
  let loginAuthProvider = userManager.loginAuthProvider;

  let router = express.Router();

  //
  // Login.
  //
  router.use('/login', function(req, res) {
    // TODO(burdon): Path const.
    res.redirect('/oauth/login/' + loginAuthProvider.providerId);
  });

  //
  // Logout.
  //
  router.use('/logout', function(req, res) {
    // http://passportjs.org/docs/logout
    req.logout();
    // TODO(burdon): Path const.
    res.redirect('/home');
  });

  //
  // Handle user registration.
  //
  router.post('/register', function(req, res, next) {

    // Get ID token (JWT) from header.
    // TODO(burdon): Create middleware version of isAuthenticated for headers.
    let idToken = UserManager.getIdTokenFromHeaders(req.headers);
    if (!idToken) {
      throw new HttpError('Missing auth token.', 401);
    }

    // All credentials.
    let { credentials } = req.body;

    // Decode the (JWT) id_token.
    loginAuthProvider.verifyIdToken(idToken).then(tokenInfo => {

      // Use the access_token to request the user's profile.
      loginAuthProvider.getUserProfile(credentials).then(userProfile => {
        console.assert(tokenInfo.id     === userProfile.id);
        console.assert(tokenInfo.email  === userProfile.email);

        // Register user.
        systemStore.registerUser(userProfile, credentials).then(user => {

          // TODO(burdon): Remove.
          systemStore.getGroup(user.id).then(group => {

            // TODO(burdon): Only active if in group (i.e., whitelisted).
            if (!group || !user.active) {
              throw new HttpError('User not active.', 403);
            } else {
              res.send({ userProfile, groupId: group.id });
            }
          });
        });
      });
    }).catch(next);
  });

  //
  // Profile page.
  //
  router.get('/profile', isAuthenticated('/home'), function(req, res, next) {
    let user = req.user;
    return systemStore.getGroup(user.id).then(group => {
      res.render('profile', {
        user,
        groups:     [ group ],
        idToken:    userManager.getIdToken(user),
        providers:  oauthRegistry.providers,
        crxUrl:     options.crxUrl
      });
    })
    .catch(next);
  });

  return router;
};

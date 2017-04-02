//
// Copyright 2016 Minder Labs.
//

import express from 'express';

import { Logger, HttpUtil } from 'minder-core';

import { getIdToken, hasJwtHeader, isAuthenticated } from './oauth';

const logger = Logger.get('user');

/**
 * Manage authentication.
 */
export class UserManager {

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
   * Gets the User item.
   *
   * @param userId
   * @return {User}
   */
  getUserFromId(userId) {
    return this._systemStore.getUser(userId);
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
  router.get('/login', function(req, res) {
    // TODO(burdon): Path const.
    res.redirect('/oauth/login/' + loginAuthProvider.providerId);
  });

  //
  // Logout.
  //
  router.get('/logout', function(req, res) {
    // http://passportjs.org/docs/logout
    req.logout();
    // TODO(burdon): Path const.
    res.redirect('/home');
  });

  //
  // Refresh (JWT) id_token (jsonp request).
  //
  router.get('/refresh_id_token', (req, res) => {
    let { callback } = req.query;
    console.assert(callback);

    res.redirect(HttpUtil.toUrl('/oauth/login/' + loginAuthProvider.providerId, {
      redirectType: 'jsonp',
      callback
    }));
  });

  //
  // Profile page.
  //
  router.get('/profile', isAuthenticated('/home'), function(req, res, next) {
    let user = req.user;
    return systemStore.getGroups(user.id).then(groups => {
      res.render('profile', {
        user,
        groups,
        idToken:    getIdToken(user),
        providers:  oauthRegistry.providers,
        crxUrl:     options.crxUrl
      });
    })
    .catch(next);
  });

  return router;
};

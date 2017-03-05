//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { Logger } from 'minder-core';

import { Const } from '../common/defs';

const logger = Logger.get('auth');

/**
 * Manage authentication.
 */
export class UserManager {

  /**
   * @param firebase Firebase wrapper.
   * @param systemStore The system store manages Users and Groups.
   */
  constructor(firebase, systemStore) {
    console.assert(firebase && systemStore);
    this._firebase = firebase;
    this._systemStore = systemStore;
  }

  /**
   * Decodes the JWT token.
   * https://jwt.io/introduction
   *
   * @param token
   * @returns {Promise<Item>}
   */
  getUserFromJWT(token) {
    console.assert(token);

    return this._firebase.verifyIdToken(token)
      .then(decodedToken => {
        let { uid:id, email } = decodedToken;
        console.assert(id, 'Invalid token: ' + JSON.stringify(decodedToken));

        return this._systemStore.getItem({}, 'User', id)
          .then(user => {
            logger.log(`Got token for: ${email}`);

            // TODO(burdon): Not part of user Item. Either create new class or return tuple.
            _.assign(user, { token });

            return user;
          });
      })
      .catch(error => {
        logger.warn('Invalid JWT (may have expired).');
      });
  }

  /**
   * Gets the User object for the current request context.
   * With firebase, auth is done by the client.
   * The Apollo client's middleware sets the authentication token with the encoded JWT token below.
   * The same sign-up flow is used by mobile clients.
   *
   * TODO(burdon): Rethink this? (e.g., user Firebase REST database auth?)
   * For server-side auth the client also set's a cookie.
   *
   * @param req HTTP request object.
   * @returns {Promise}
   */
  getUserFromHeader(req) {
    console.assert(req);

    // Token set in apollo client's network interface middleware.
    let auth = _.get(req.headers, 'authentication');
    let match = auth && auth.match(/^Bearer (.+)$/);
    let token = match && match[1];
    if (!token) {
      return Promise.resolve(null);
    }

    return this.getUserFromJWT(token).catch(error => {
      error && logger.error(error);
    });
  }

  /**
   * Gets the user from the JWT token in a cookie set by the login client.
   *
   * @param req HTTP request object.
   * @returns {Promise}
   */
  getUserFromCookie(req) {
    console.assert(req);

    // Cookie set by auth script before app loads.
    let token = _.get(req.cookies, Const.AUTH_COOKIE);
    if (!token) {
      return Promise.resolve(null);
    }

    return this.getUserFromJWT(token).catch(error => {
      error && logger.error(error);
    });
  }
}

/**
 * Manage user authentication.
 *
 * @param userManager
 * @param systemStore
 * @param options
 * @returns {Router}
 */
export const loginRouter = (userManager, systemStore, options) => {
  console.assert(systemStore);

  let router = express.Router();

  // Parse login cookie (set by client).
  router.use(cookieParser());

  // JSON body.
  router.use(bodyParser.json());

  // Login page.
  router.use('/login', function(req, res) {
    // Firebase JS login.
    res.render('login') ;
  });

  // Logout page (javascript).
  router.use('/logout', function(req, res) {
    // Firebase JS login.
    res.render('logout');
  });

  // Handle user registration.
  router.post('/register', async function(req, res) {
    let { user, credential } = req.body;

    logger.log('User registration: ' + JSON.stringify(_.pick(user, ['uid', 'email', 'active'])));
    res.send(JSON.stringify({
      user: await systemStore.registerUser(user, credential)
    }));
  });

  // Profile page.
  router.get('/profile', async function(req, res) {
    let user = await userManager.getUserFromCookie(req);
    if (user) {
      let group = await systemStore.getGroup(user.id);
      res.render('profile', { user, group });
    } else {
      res.redirect('/home');
    }
  });

  return router;
};

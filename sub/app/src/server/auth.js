//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { Logger, IdGenerator } from 'minder-core';

import { Const } from '../common/defs';

const logger = Logger.get('auth');

/**
 * Manage authentication.
 */
export class AuthManager {

  /**
   * @param admin Firebase admin object.
   * @param systemStore Firebase user store.
   */
  constructor(admin, systemStore) {
    console.assert(admin && systemStore);
    this._admin = admin;
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

    // https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_the_firebase_admin_sdks
    return this._admin.auth().verifyIdToken(token)
      .then(decodedToken => {
        let { uid:id, email } = decodedToken;
        console.assert(id, 'Invalid token: ' + JSON.stringify(decodedToken));

        this._systemStore.getItem({}, 'User', id)
          .then(user => {
            logger.log(`Got token for: ${email}`);

            // TODO(burdon): Not part of user Item. Either create new class or return tuple.
            _.assign(user, { token });

            return user;
          })
          .catch(error => {
            logger.warn('Error getting user: ' + error);
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
    let auth = req.headers && req.headers['authentication'];
    let match = auth && auth.match(/^Bearer (.+)$/);
    let token = match && match[1];

    return this.getUserFromJWT(token).catch(error => {
      error && logger.error(error);
      return null;
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

    let token = req.cookies && req.cookies[Const.AUTH_COOKIE];
    return this.getUserFromJWT(token).catch(error => {
      error && logger.error(error);
      return null;
    });
  }
}

/**
 * Manage user authentication.
 *
 * @param systemStore
 * @param options
 * @returns {Router}
 */
export const loginRouter = (systemStore, options) => {
  console.assert(systemStore);

  let router = express.Router();

  // Parse login cookie (set by client).
  router.use(cookieParser());

  // JSON body.
  router.use(bodyParser.json());

  // Login page.
  router.use('/login', function(req, res) {
    // Firebase JS login.
    res.render('login');
  });

  // Logout page (javascript).
  router.use('/logout', function(req, res) {
    // Firebase JS login.
    res.render('logout');
  });

  // Handle user registration.
  router.post('/register', async function(req, res) {
    let { user, credential } = req.body;
    logger.log('User registration: ' + JSON.stringify(_.pick(user, ['uid', 'email'])));

    res.send(JSON.stringify({
      user: await systemStore.upsertUser(user, credential)
    }));
  });

  return router;
};

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { ErrorUtil, NotAuthenticatedError, Logger } from 'minder-core';

import { Const } from '../common/defs';

const logger = Logger.get('user');

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
   * https://jwt.io (Test decoding token).
   *
   * @param token
   * @returns {Promise<Item>}
   */
  getUserFromJWT(token) {
    console.assert(token);

    return this._firebase.verifyIdToken(token)
      .then(decodedToken => {
        let { uid, email } = decodedToken;
        console.assert(uid, 'Invalid token: ' + JSON.stringify(decodedToken));

        return this._systemStore.getItem({}, 'User', uid)
          .then(user => {
            if (!user) {
              logger.warn('Invalid UID: ' + uid);
              return null;
            }

            logger.log(`Got token for: ${email}`);

            // TODO(burdon): Not part of user Item. Either create new class or return tuple.
            _.assign(user, { token });

            return user;
          });
      })
      .catch (error => {
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
   * @param required If true then throw if null.
   * @returns {Promise}
   */
  getUserFromHeader(req, required) {
    console.assert(req);

    // Token set in apollo client's network interface middleware.
    // NOTE: Express headers are lowercase.
    let auth = _.get(req.headers, Const.HEADER.AUTHORIZATION.toLowerCase());
    let match = auth && auth.match(/^Bearer (.+)$/);
    let token = match && match[1];
    if (!token) {
      if (required) {
        throw NotAuthenticatedError();
      }
      return Promise.resolve(null);
    }

    return this.getUserFromJWT(token).catch(error => {
      logger.error(ErrorUtil.message(error));
    });
  }

  /**
   * Gets the user from the JWT token in a cookie set by the login client.
   *
   * @param req HTTP request object.
   * @param required If true then throw if null.
   * @returns {Promise}
   */
  getUserFromCookie(req, required) {
    console.assert(req);

    // Cookie set by auth script before app loads.
    let token = _.get(req.cookies, Const.AUTH_COOKIE);
    if (!token) {
      if (required) {
        throw NotAuthenticatedError();
      }

      return Promise.resolve(null);
    }

    return this.getUserFromJWT(token).catch(error => {
      logger.error(ErrorUtil.message(error));
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
export const loginRouter = (userManager, oauthRegistry, systemStore, options) => {
  console.assert(userManager && oauthRegistry && systemStore);

  let router = express.Router();

  // Parse login cookie (set by client).
  router.use(cookieParser());

  // JSON body.
  router.use(bodyParser.json());

  // Login page.
  router.use('/login', function(req, res) {

    // Firebase JS login.
    res.render('login');

    // res.redirect('/oauth/login/google_com');    // TODO(burdon): !!!
  });

  // Logout page (javascript).
  router.use('/logout', function(req, res) {
    // Firebase JS login.
    res.render('logout');

    // res.redirect('/oauth/logout');
    // res.redirect('/user/profile');
  });

  // Handle user registration.
  router.post('/register', function(req, res, next) {
    let { userInfo, credential } = req.body;

    // Update or register user.
    return systemStore.registerUser(userInfo, credential)
      .then(user => {
        res.send(JSON.stringify({ user }));
      })
      .catch(next);
  });

  // Profile page.
  router.get('/profile', function(req, res, next) {
    return userManager.getUserFromCookie(req)
      .then(user => {
        if (user) {
          return systemStore.getGroup(user.id)
            .then(group => {
              res.render('profile', {
                user,
                groups: [ group ],
                providers: oauthRegistry.providers,
                crxUrl: Const.CRX_URL(Const.CRX_ID)
              });
            })
        } else {
          res.redirect('/home');
        }
      })
      .catch(next);
  });

  return router;
};

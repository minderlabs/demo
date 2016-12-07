//
// Copyright 2016 Minder Labs.
//

'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import admin from 'firebase-admin';

/**
 * Manage authentication.
 */
export class AuthManager {

  /**
   * Decodes the JWT token.
   * @param token
   * @returns {Promise}
   */
  getUserFromJWT(token) {
    return new Promise((resolve, reject) => {
      if (!token) {
        reject();
      } else {
        // Token set by apollo client's network interface middleware.
        // https://jwt.io/introduction
        //    console.log('Validating token...');
        admin.auth().verifyIdToken(token)
          .then(decodedToken => {
            let { uid:id, name, email } = decodedToken;
            console.log('Got token for: %s', email);
            resolve({
              id, name, email, token
            });
          })
          .catch(error => {
            console.warn('Invalid JWT (may have expired).');
            reject();
          });
      }
    });
  }

  /**
   * Gets the User ID from the request.
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
  getUserInfoFromHeader(req) {
    console.assert(req);

    //console.log('Getting token from header...');
    let auth = req.headers && req.headers['authentication'];
    let match = auth && auth.match(/^Bearer (.+)$/);
    let token = match && match[1];

    return this.getUserFromJWT(token).catch(() => null);
  }

  /**
   * Gets the user from the JWT token in a cookie set by the login client.
   *
   * @param req HTTP request object.
   * @returns {Promise}
   */
  getUserInfoFromCookie(req) {
    console.assert(req);

    //console.log('Getting token from cookie...');
    let token = req.cookies && req.cookies['minder_auth_token'];

    return this.getUserFromJWT(token).catch(() => null);
  }
}

/**
 * Manage user authentication.
 *
 * @param userStore
 * @param options
 * @returns {core.Router|*}
 */
export const loginRouter = (userStore, options) => {
  console.assert(userStore);

  let router = express.Router();

  // Parse login cookie (set by client).
  router.use(cookieParser());

  // JSON body.
  router.use(bodyParser.json());

  // Login page.
  router.use('/user/login', function(req, res) {
    // Firebase JS login.
    res.render('login');
  });

  // Logout page (javascript).
  router.use('/user/logout', function(req, res) {
    // Firebase JS login.
    res.render('logout');
  });

  // Regiser user.
  router.post('/user/register', function(req, res) {
    userStore.upsertUser(req.body);
    res.send({});
  });

  return router;
};

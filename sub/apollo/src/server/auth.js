//
// Copyright 2016 Minder Labs.
//

'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

const USER_COOKIE = 'minder_userid';

/**
 * Gets the User ID from the request.
 *
 * @param req HTTP request object.
 * @returns {String} User ID (or undefined if not authenticated).
 */
export const requestContext = (req) => {
  console.assert(req && req.cookies);

  // TODO(burdon): Factor out consts (shared with client.network); standardize cookie/header.
  return {
    userId: req.headers['mx-user-id'] || req.cookies[USER_COOKIE]
  }
};

/**
 * Manage user authentication.
 *
 * @param options
 * @returns {core.Router|*}
 */
export const loginRouter = (options) => {
  let router = express.Router();

  router.use(cookieParser());

  // Encoded bodies (Form post).
  router.use(bodyParser.urlencoded({ extended: true }));

  // Fake auth posted.
  router.post('/auth', function(req, res) {
    let userId = req.body.userId;

    let auth = false;
    if (userId) {
      auth = options.users.some((user) => {
        return user.id === userId;
      });
    }

    if (!auth) {
      res.redirect('/login');
      return;
    }

    // Set user cookie.
    // TODO(burdon): Cookie options?
    // http://expressjs.com/en/api.html#res.cookie
    res.cookie(USER_COOKIE, userId);

    // Redirect to app.
    // TODO(burdon): Const (share path with client).
    res.redirect('/app');
  });

  // Login page.
  router.use('/login', function(req, res) {
    res.render('login');
  });

  // Logout redirect.
  router.use('/logout', function(req, res) {
    res.clearCookie(USER_COOKIE);
    res.redirect('/login');
  });

  return router;
};

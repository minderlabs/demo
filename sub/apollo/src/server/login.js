//
// Copyright 2016 Minder Labs.
//

'use strict';

import express from 'express';
import cookieParser from 'cookie-parser';

export const USER_COOKE = 'minder-username';

/**
 * Manage user authentication.
 *
 * @param options
 * @returns {core.Router|*}
 */
export const loginRouter = (options) => {
  const router = express.Router();

  router.use(cookieParser());

  router.post('/auth', function(req, res) {
    let username = req.body.username;

    let auth = false;
    if (username) {
      auth = options.users.some((user) => {
        return user.id === username;
      });
    }

    if (!auth) {
      res.redirect('/login');
      return;
    }

    // Set user cookie.
    res.cookie(USER_COOKE, username);

    // Redirect to app.
    res.redirect('/');
  });

  router.use('/login', function(req, res) {
    res.render('login');
  });

  router.use('/logout', function(req, res) {
    res.clearCookie(USER_COOKE);
    res.redirect('/login');
  });

  return router;
};

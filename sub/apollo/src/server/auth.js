//
// Copyright 2016 Minder Labs.
//

'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';


// Firebase
// On server:
// Get JWT token on client: firebase.auth().currentUser.getToken
// https://firebase.google.com/docs/admin/setup
// Validate header: admin.auth().verifyIdToken(idToken) []


// https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert('src/server/conf/minder-beta-firebase-adminsdk-n6arv.json'),
  databaseURL: 'https://minder-beta.firebaseio.com'
});





// TODO(burdon): Remove.
const USER_COOKIE = 'minder_userid';


/**
 * Gets the User ID from the request.
 *
 * @param req HTTP request object.
 * @returns {String} User ID (or undefined if not authenticated).
 */
export function requestContext(req) {
  console.assert(req && req.cookies);

  // TODO(burdon): Use server side also (async).

  // TODO(burdon): Handle error

    let auth = req.headers['authentication'];
    let match = auth.match(/^Bearer (.+)$/);
    let token = match && match[1];
//    if (idToken) {

    console.log('>>>>>>>>>>>>>>>>>>>> GETTING', token);

    // resolve({ user: 'ssss' });

  return admin.auth().verifyIdToken(token)
      .then(function(decodedToken) {
        var uid = decodedToken.uid;

        console.log('### GOT USER-ID', uid);  // TODO(burdon): Need to look-up with firebase?

        return /*resolve(*/{
          user: uid
        };//);
      }).catch(function(error) {

      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

        console.error(error);
      });


//   // Authorization Bearer
//   // https://tools.ietf.org/html/rfc6750
//   let auth = req.headers['authentication'];
//   console.log('### AUTH: %s', auth);
// //  if (auth) {
//     let match = auth.match(/^Bearer (.+)$/);
//     let idToken = match && match[1];
// //    if (idToken) {
//
//       // TODO(burdon): Context cannot be a promise
//       // https://github.com/apollostack/graphql-server/issues/225
//       return await getUser(idToken);
// //    }
// //  }

  // TODO(burdon): JWT header.
  // TODO(burdon): Async resolver?
  // http://dev.apollodata.com/tools/graphql-tools/resolvers.html#Resolver-result-format
  // TODO(burdon): Factor out consts (shared with client.network); standardize cookie/header.
  // return {
  //   userId: req.headers['mx-user-id'] || req.cookies[USER_COOKIE]
  // }
}

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

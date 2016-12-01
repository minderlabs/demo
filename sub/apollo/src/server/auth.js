//
// Copyright 2016 Minder Labs.
//

'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';


// TODO(burdon): Change to import.
// https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
const admin = require('firebase-admin');

// https://firebase.google.com/docs/admin/setup
admin.initializeApp({
  credential: admin.credential.cert('src/server/conf/minder-beta-firebase-adminsdk-n6arv.json'),
  databaseURL: 'https://minder-beta.firebaseio.com'
});


// https://firebase.google.com/docs/reference/admin/node/admin.database.Query
var ref = admin.database().ref("dinosaurs");
ref.orderByKey().endAt("pterodactyl").on("child_added", function(snapshot) {
  console.log(snapshot.key);
});



/**
 * Decodes the JWT token.
 * @param token
 * @returns {*|Promise.<T>}
 */
function getUserFromJWT(token) {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject();
    } else {
      // Token set by apollo client's network interface middleware.
      // https://jwt.io/introduction
//    console.log('Validating token...');
      admin.auth().verifyIdToken(token)
        .then(decodedToken => {
          let { uid:userId, name, email } = decodedToken;
          console.log('Got token for: %s', email);
          resolve({
            token, userId, name, email
          });
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
export function getUserInfoFromHeader(req) {
  console.assert(req);

//console.log('Getting token from header...');
  let auth = req.headers && req.headers['authentication'];
  let match = auth && auth.match(/^Bearer (.+)$/);
  let token = match && match[1];

  return getUserFromJWT(token).catch(() => null);
}

/**
 * Gets the user from the JWT token in a cookie set by the login client.
 *
 * @param req HTTP request object.
 * @returns {Promise}
 */
export function getUserInfoFromCookie(req) {
  console.assert(req);

//console.log('Getting token from cookie...');
  let token = req.cookies && req.cookies['minder_auth_token'];

  return getUserFromJWT(token).catch(() => null);
}

/**
 * Manage user authentication.
 *
 * @param options
 * @returns {core.Router|*}
 */
export const loginRouter = (options) => {
  let router = express.Router();

  // Parse login cookie (set by client).
  router.use(cookieParser());

  // Encoded bodies (Form post).
  router.use(bodyParser.urlencoded({ extended: true }));

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

  return router;
};

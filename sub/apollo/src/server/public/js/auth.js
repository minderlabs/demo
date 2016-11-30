//
// Copyright 2016 Minder Labs.
//

'use strict';

// TODO(burdon): Build as bundle.

// TODO(burdon): Factor out const.
firebase.initializeApp({
  apiKey: 'AIzaSyDwDsz7hJWdH2CijLItaQW6HmL7H9uDFcI',
  authDomain: 'minder-beta.firebaseapp.com',
  databaseURL: 'https://minder-beta.firebaseio.com',
  storageBucket: 'minder-beta.appspot.com',
  messagingSenderId: '189079594739'
});

// https://firebase.google.com/docs/auth/web/google-signin
let provider = new firebase.auth.GoogleAuthProvider();

provider.addScope('https://www.googleapis.com/auth/plus.login');

const COOKIE = 'minder_auth_token';

window.minder = {

  // TODO(burdon): Popup.

  login: function(path) {
    console.log('LOGIN');
    firebase.auth().getRedirectResult()
      .then(function(result) {

        // Google access token.
        // TODO(burdon): Set cookie for server-side use.
        if (result.credential) {
          let token = result.credential.accessToken;
        }

        // The signed-in user info.
        let user = result.user;
        if (user) {
          firebase.auth().currentUser.getToken().then(token => {

            // Se the auth cookie for server-side detection.
            // https://github.com/js-cookie/js-cookie
            Cookies.set(COOKIE, token, {
//            path: '/',
              domain: window.location.hostname,
              expires: 1,       // 1 day.
//            secure: true      // If served over HTTPS.
            });

            // Redirect (to app).
            window.location.href = path;
          });

        } else {
          firebase.auth().signInWithRedirect(provider);
        }
      })
      .catch(function(error) {
        console.log('ERROR', error);
      });
  },

  logout: function(path) {
    console.log('LOGOUT');
    firebase.auth().signOut().then(function() {
      // Remove the cookie.
      Cookies.remove(COOKIE);

      window.location.href = path;
    }, function(error) {
      console.log('ERROR', error);
    });
  }
};

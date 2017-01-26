//
// Copyright 2016 Minder Labs.
//

// TODO(burdon): Move path defs here.

/**
 * https://console.firebase.google.com/project/minder-beta/overview
 * https://console.firebase.google.com/project/minder-beta/authentication/users
 */
export const FirebaseConfig = {
  apiKey: 'AIzaSyDwDsz7hJWdH2CijLItaQW6HmL7H9uDFcI',
  authDomain: 'minder-beta.firebaseapp.com',
  databaseURL: 'https://minder-beta.firebaseio.com',
  storageBucket: 'minder-beta.appspot.com',
  messagingSenderId: '189079594739'
};

/**
 * Web application credentials.
 * https://console.developers.google.com/apis/credentials/oauthclient/189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com?project=minder-beta
 */
export const GoogleApiConfig = {
  clientId: '189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com',
  clientSecret: 'WZypHT09Z8Fy8NHVKY3qmMFt',

  // TODO(madadam): Scopes for a specific service should be specified by that service provider.
  authScopes: [
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
};

/**
 * App-wide constants.
 */
export const Const = {

  APP_NAME: 'minder',
  APP_VERSION: "0.1.0",

  DEF_TEAM: 'minderlabs',

  AUTH_COOKIE: 'minder_auth_token'
};

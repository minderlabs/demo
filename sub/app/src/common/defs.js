//
// Copyright 2016 Minder Labs.
//

import path from 'path';

/**
 * Client configuration.
 * https://console.firebase.google.com/project/minder-beta/overview
 * https://console.firebase.google.com/project/minder-beta/authentication/providers (Web Setup)
 */
export const FirebaseAppConfig = {
  apiKey: 'AIzaSyDwDsz7hJWdH2CijLItaQW6HmL7H9uDFcI',
  authDomain: 'minder-beta.firebaseapp.com',
  databaseURL: 'https://minder-beta.firebaseio.com',
  storageBucket: 'minder-beta.appspot.com',

  // https://console.firebase.google.com/project/minder-beta/settings/cloudmessaging
  messagingSenderId: '189079594739',

  // Generated 3/4/17 (Create Key from Service Accounts: firebase-adminsdk).
  // https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
  // https://console.cloud.google.com/iam-admin/serviceaccounts/project?consoleUI=FIREBASE&project=minder-beta
  credentialPath: path.join(__dirname, './conf/minder-beta-44ee54278556.json')
};

// TODO(burdon): Manage configs.
export const FirebaseTestingAppConfig = {
  apiKey: 'AIzaSyCY0hLfIzi7czDCZWpPn91h8phr5wm7uTI',
  authDomain: 'minder-qa.firebaseapp.com',
  databaseURL: 'https://minder-qa.firebaseio.com',
  storageBucket: 'minder-qa.appspot.com',
  messagingSenderId: '161622947109',

  // Generated 3/4/17 (Create Key from Service Accounts: firebase-adminsdk).
  // https://console.firebase.google.com/project/minder-qa/settings/serviceaccounts/adminsdk
  // https://console.cloud.google.com/iam-admin/serviceaccounts/project?consoleUI=FIREBASE&project=minder-qa
  credentialPath: path.join(__dirname, './conf/minder-qa-e90e2fe651a3.json')
};

/**
 * Server-side secrets.
 */
export const FirebaseServerConfig = {

  // https://console.firebase.google.com/project/minder-beta/settings/cloudmessaging
  messagingServerKey: 'AAAALAYFpvM:APA91bFAHRSZF-8_qyJQgkoBaWby3zbGe7KmKQj8Yc7WaEXcLXGECPkcEn8swKY8FZu6wScH6DZvn8DmvB1QUw3ENT_pahSbs6H4SPfBih1vmmexkiiMpvKdHEsjYOAJosMxuJkhuKK2lk2epcYvYPpLUS66i-2Zbg'
};

/**
 * Project Config: minder-beta
 */
export const GoogleApiConfig = {

  // https://console.cloud.google.com/iam-admin/settings/project?project=minder-beta
  projectNumber: 189079594739,

  // Created 11/28/16
  // Web application credentials.
  // https://console.developers.google.com/apis/credentials/oauthclient/189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com?project=minder-beta
  clientId: '189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com',
  clientSecret: 'WZypHT09Z8Fy8NHVKY3qmMFt',

  // https://myaccount.google.com/permissions
  // TODO(madadam): Scopes for a specific service should be specified by that service provider.
  authScopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
};

/**
 * https://api.slack.com/apps
 */
export const SlackConfig = {
  // "Minder dev" app, as of 20170127.
  clientId: '53451657299.53512586673',
  clientSecret: 'a0efe3524ec77b352f253dc2c4b0e612'
};

/**
 * App-wide constants.
 */
export const Const = {

  PLATFORM: {
    WEB:    'web',
    CRX:    'crx',
    MOBILE: 'mobile'
  },

  DOM_ROOT: 'app-root',

  APP_PATH: '/app',

  APP_NAME: 'minder',

  // NOTE: Changed by grunt:version
  APP_VERSION: "0.1.10",

  // NOTE: Express lowercases headers.
  HEADER: {

    // https://en.wikipedia.org/wiki/Basic_access_authentication
    AUTHORIZATION: 'Authorization',

    // Client ID set by server (Web) or on registration (CRX, mobile).
    CLIENT_ID: 'minder-client',

    // Use by Apollo network middleware to track request/response messages.
    REQUEST_ID: 'minder-request'
  },

  // Stores JWT set by client login script (auth.js).
  AUTH_COOKIE: 'minder_auth_token',

  // https://chrome.google.com/webstore/developer/edit/ofdkhkelcafdphpddfobhbbblgnloian
  CRX_ID: 'ofdkhkelcafdphpddfobhbbblgnloian',
  CRX_URL: crxId => 'https://chrome.google.com/webstore/detail/' + crxId
};

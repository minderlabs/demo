//
// Copyright 2016 Minder Labs.
//

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
};

/**
 * Server-side secrets.
 */
export const FirebaseServerConfig = {

  // https://console.firebase.google.com/project/minder-beta/settings/cloudmessaging
  messagingServerKey: 'AAAALAYFpvM:APA91bFAHRSZF-8_qyJQgkoBaWby3zbGe7KmKQj8Yc7WaEXcLXGECPkcEn8swKY8FZu6wScH6DZvn8DmvB1QUw3ENT_pahSbs6H4SPfBih1vmmexkiiMpvKdHEsjYOAJosMxuJkhuKK2lk2epcYvYPpLUS66i-2Zbg'
};

/**
 * Web application credentials.
 * https://console.developers.google.com/apis/credentials/oauthclient/189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com?project=minder-beta
 */
export const GoogleApiConfig = {
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

  APP_PATH: '/app',

  DOM_ROOT: 'app-root',

  APP_NAME: 'minder',

  // NOTE: Changed by grunt:version
  APP_VERSION: "0.1.6",

  AUTH_COOKIE: 'minder_auth_token',

  PLATFORM: {
    WEB:    'web',
    CRX:    'crx',
    MOBILE: 'mobile'
  },

  // https://chrome.google.com/webstore/developer/edit/ofdkhkelcafdphpddfobhbbblgnloian
  CRX_ID: 'ofdkhkelcafdphpddfobhbbblgnloian'
};

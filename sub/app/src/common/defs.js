//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
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

  // TODO(burdon): Make const: move
  // Generated 3/4/17 (Create Key from Service Accounts: firebase-adminsdk).
  // https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
  // https://console.cloud.google.com/iam-admin/serviceaccounts/project?consoleUI=FIREBASE&project=minder-beta
  credentialPath: './minder-beta-44ee54278556.json',

  // https://console.firebase.google.com/project/minder-beta/settings/cloudmessaging
  messagingServerKey: 'AAAALAYFpvM:APA91bFAHRSZF-8_qyJQgkoBaWby3zbGe7KmKQj8Yc7WaEXcLXGECPkcEn8swKY8FZu6wScH6DZvn8DmvB1QUw3ENT_pahSbs6H4SPfBih1vmmexkiiMpvKdHEsjYOAJosMxuJkhuKK2lk2epcYvYPpLUS66i-2Zbg'
};

/**
 * Analytics
 */
const AnalyticsConfig = {

  // Google Analytics
  // https://analytics.google.com/analytics/web/#management/Settings/a82404502w137842039p142136815/
  googleAnalyticsTrackingId: 'UA-82404502-2',

  // Segment Analytics
  // https://segment.com/minderlabs/sources/jsweb/settings/keys
  segmentWriteKey: 'zNgiIvbGonawzsamSbKQ9WlX0WgXcy2b'
};

/**
 * Project Config: minder-beta
 */
const GoogleApiConfig = {

  // https://console.cloud.google.com/iam-admin/settings/project?project=minder-beta
  projectNumber: 189079594739,

  // Created 11/28/16
  // Web application credentials.
  // https://console.developers.google.com/apis/credentials/oauthclient/189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com?project=minder-beta
  clientId: '189079594739-s67su4gkudu0058ub4lpcr3tnp3fslgj.apps.googleusercontent.com',
  clientSecret: 'WZypHT09Z8Fy8NHVKY3qmMFt'
};

/**
 * https://api.slack.com/apps
 */
const SlackConfig = {

  // "Minder dev" app, as of 01/27/17.
  clientId: '53451657299.53512586673',
  clientSecret: 'a0efe3524ec77b352f253dc2c4b0e612'
};

/**
 * Client App.
 */
const AppConfig = {

  // https://chrome.google.com/webstore/developer/edit/ofdkhkelcafdphpddfobhbbblgnloian
  crxId: 'ofdkhkelcafdphpddfobhbbblgnloian',
  crxUrl: 'https://chrome.google.com/webstore/detail/ofdkhkelcafdphpddfobhbbblgnloian'
};

//
// Master config.
// TODO(burdon): Move to YML.
// TODO(burdon): Manage secrets?
//

export const Config = {

  get: (key, keys=undefined) => {
    console.assert(key);
    let values = _.get(Config, key);
    if (keys) {
      return _.pick(values, keys);
    } else {
      return values;
    }
  },

  analytics:  AnalyticsConfig,
  app:        AppConfig,
  firebase:   FirebaseAppConfig,
  google:     GoogleApiConfig,
  slack:      SlackConfig

};

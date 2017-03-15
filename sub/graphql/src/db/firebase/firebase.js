//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import admin from 'firebase-admin';

import { Logger } from 'minder-core';

const logger = Logger.get('firebase');

/**
 * Firebase datastore.
 * https://firebase.google.com/docs/database
 * https://firebase.google.com/docs/reference/js/firebase.database.Database
 *
 * Console:
 * https://console.firebase.google.com/project/minder-beta/database/data
 */
export class Firebase {

  /**
   * Creates the Firebase singleton app and wraps utils.
   *
   * @param config
   */
  constructor(config) {

    // https://firebase.google.com/docs/admin/setup
    // https://firebase.google.com/docs/reference/admin/node/admin
    this._app = admin.initializeApp(_.defaults(config, {
      credential: admin.credential.cert(config.credentialPath)
    }));

    logger.info('Initialized: ' + config.databaseURL);
  }

  /**
   * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_the_firebase_admin_sdks
   * @param token
   * @return { uid, email }
   */
  verifyIdToken(token) {
    return this._app.auth().verifyIdToken(token);
  }

  get db() {
    return this._app.database();
  }
}

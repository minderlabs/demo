//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import admin from 'firebase-admin';

import { Logger } from 'minder-core';

import { FirebaseUserStore } from './firebase_user_store';
import { FirebaseItemStore } from './firebase_item_store';

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

  // TODO(burdon): Namespace (prod, qa, dev-rich, dev-adam).

  constructor(matcher, config) {
    console.assert(matcher);

    _.assign(config, {
      credential: admin.credential.cert(config.credentialPath)
    });

    // https://firebase.google.com/docs/admin/setup
    // https://firebase.google.com/docs/reference/admin/node/admin
    let app = admin.initializeApp(config);
    logger.log(`INITIALIZED: ${app.name}`);

    this._db = admin.database();

    this._userStore = new FirebaseUserStore(this._db, matcher);
    this._itemStore = new FirebaseItemStore(this._db, matcher);
  }

  clearCache() {
    this._userStore.clearCache();
    this._itemStore.clearCache();
  }

  /**
   * NOTE: This must be a shared instance since it is initialized here.
   */
  get admin() {
    return admin;
  }

  get userStore() {
    return this._userStore;
  }

  get itemStore() {
    return this._itemStore;
  }
}

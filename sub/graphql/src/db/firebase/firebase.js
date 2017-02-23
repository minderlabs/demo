//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import admin from 'firebase-admin';

import { Logger } from 'minder-core';

import { Database } from '../database';
import { SystemStore } from './firebase_system_store';
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

  constructor(idGenerator, matcher, config) {
    console.assert(idGenerator && matcher);

    _.assign(config, {
      credential: admin.credential.cert(config.credentialPath)
    });

    // https://firebase.google.com/docs/admin/setup
    // https://firebase.google.com/docs/reference/admin/node/admin
    let app = admin.initializeApp(config);
    logger.log(`INITIALIZED: ${app.name}`);

    this._db = admin.database();

    this._systemStore = new SystemStore(this._db, idGenerator, matcher, Database.SYSTEM_NAMESPACE);
    this._itemStore = new FirebaseItemStore(this._db, idGenerator, matcher, Database.DEFAULT_NAMESPACE);
  }

  clearCache() {
    this._systemStore.clearCache();
    this._itemStore.clearCache();
  }

  /**
   * NOTE: This must be a shared instance since it is initialized here.
   */
  get admin() {
    return admin;
  }

  get systemStore() {
    return this._systemStore;
  }

  get itemStore() {
    return this._itemStore;
  }
}

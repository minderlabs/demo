//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';
import path from 'path';

import admin from 'firebase-admin';

import { ItemStore } from 'minder-core';

/**
 * Firebase datastore.
 * https://firebase.google.com/docs/database
 * https://firebase.google.com/docs/reference/js/firebase.database.Database
 *
 * Console:
 * https://console.firebase.google.com/project/minder-beta/database/data
 */
export class FirebaseStore {

  // TODO(burdon): Namespace (prod, qa, dev-rich, dev-adam).
  // TODO(burdon): Type-based namespace.

  // TODO(burdon): Move to sub/data.

  static sanitizeKey(key) {
    return key.replace('.', '_');
  }

  constructor(matcher, config) {
    console.assert(matcher);

    _.assign(config, {
      credential: admin.credential.cert(config.credentialPath)
    });

    // https://firebase.google.com/docs/admin/setup
    admin.initializeApp(config);

    this._db = admin.database();

    this._userStore = new FirebaseUserStore(this._db, matcher);
  }

  get userStore() {
    return this._userStore;
  }
}

/**
 * User store.
 */
class FirebaseUserStore extends ItemStore {

  static toItem(uid, user) {
    return {
      id:     uid,
      type:   'User',
      title:  user.profile.name
    };
  }

  constructor(db, matcher) {
    super(matcher);
    console.assert(db);
    this._db = db;
    this._cache = new Map();
    this._initialized = false;
  }

  updateCache() {
    // TODO(burdon): Use FB to do filtering?
    // https://firebase.google.com/docs/database/web/read-and-write#read_data_once
    // https://firebase.google.com/docs/reference/js/firebase.database.Reference#once
    // https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
    return this._db.ref('users').orderByKey().once('value').then(data => {
      _.each(data.val(), (record, uid) => {
        this._cache.set(uid, FirebaseUserStore.toItem(uid, record));
      });
    });
  }

  maybeUpdateCache() {
    return Promise.all([this._initialized ? null : this.updateCache()]);
  }

  upsertUser(data) {
    let { user, credential } = data;
    let { uid, email, name } = user;
    let { accessToken, idToken, provider } = credential;
    console.assert(uid);

    // https://firebase.google.com/docs/database/web/read-and-write
    let record = {

      profile: {
        email,
        name
      },

      credentials: {
        [FirebaseStore.sanitizeKey(provider)]: {
          accessToken,
          idToken
        }
      }
    };

    this._db.ref('users/' + uid).set(record);
    this._cache.set(uid, FirebaseUserStore.toItem(uid, record));
  }

  //
  // ItemStore API.
  //

  getItems(context, type, itemIds) {
    return this.maybeUpdateCache().then(() => {
      return this._matcher.matchItems(context, {}, { ids: itemIds }, Array.from(this._cache.values()));
    });
  }

  queryItems(context, root, filter={}) {
    return this.maybeUpdateCache().then(() => {
      return this._matcher.matchItems(context, {}, filter, Array.from(this._cache.values()));
    });
  }
}

//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

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

  // TODO(burdon): Move to sub/data.

  static sanitizeKey(key) {
    return key.replace('.', '_');
  }

  constructor(matcher) {
    console.assert(matcher);

    // TODO(burdon): Factor out const.
    // https://firebase.google.com/docs/database/admin/start
    const config = {
      credential: admin.credential.cert('src/server/conf/minder-beta-firebase-adminsdk-n6arv.json'),
      databaseURL: 'https://minder-beta.firebaseio.com'
    };

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
  }

  upsertUser(data) {
    let { user, credential } = data;
    let { uid, email, name } = user;
    let { accessToken, idToken, provider } = credential;
    console.assert(uid);

    // https://firebase.google.com/docs/database/web/read-and-write
    this._db.ref('users/' + uid).set({

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
    });
  }

  //
  // ItemStore API.
  //

  getItems(context, type, itemIds) {
    return this._db.ref('users').orderByKey().once('value').then((data) => {

      // Match by ID.
      return _.compact(_.map(data.val(), (user, uid) => {
        return _.indexOf(itemIds, uid) != -1 && FirebaseUserStore.toItem(uid, user);
      }));
    });
  }

  queryItems(context, filter={}) {

    // TODO(madadam): Iterate the matcher over a (synced) local object instead of making a FB request every time?

    // https://firebase.google.com/docs/database/web/read-and-write#read_data_once
    // https://firebase.google.com/docs/reference/js/firebase.database.Reference#once
    return this._db.ref('users').orderByKey().once('value').then((data) => {

      // TODO(burdon): Use FB to do filtering?
      // https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
      return _.compact(_.map(data.val(), (record, uid) => {
        let user = FirebaseUserStore.toItem(uid, record);
        return this._matcher.match(filter, user) && user;
      }));
    });
  }
}

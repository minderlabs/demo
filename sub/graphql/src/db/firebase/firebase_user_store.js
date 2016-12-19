//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { ItemStore } from 'minder-core';

import { Cache } from './cache';

/**
 * User store.
 */
export class FirebaseUserStore extends ItemStore {

  // Root database node.
  static ROOT = 'users';

  /**
   * Parses the root node of the data set, inserting items into the item store.
   * @param itemStore
   * @param data
   */
  static parseData(itemStore, data) {
    let items = [];
    _.each(data.val(), (record, key) => {
      items.push(FirebaseUserStore.recordToItem(key, record));
    });

    itemStore.upsertItems({}, items);
  }

  /**
   * Converts firebase User records to items.
   */
  static recordToItem(key, record) {
    // TODO(madadam): Credentials isn't part of the schema; needs to be?
    return {
      id:     key,
      type:   'User',
      title:  record.profile.name,
      email:  record.profile.email,
      credentials: record.credentials
    }
  }

  constructor(db, matcher) {
    super(matcher);
    console.assert(db);

    this._db = db;
    this._cache = new Cache(this._db, FirebaseUserStore.ROOT, matcher, FirebaseUserStore.parseData);
  }

  clearCache() {
    return this._cache.getItemStore(true);
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
        [Cache.sanitizeKey(provider)]: {
          accessToken,
          idToken
        }
      }
    };

    this._db.ref(FirebaseUserStore.ROOT + '/' + uid).set(record);

    this._cache.getItemStore()
      .then(itemStore => itemStore.upsertItem({}, FirebaseUserStore.recordToItem(uid, record)));
  }

  //
  // ItemStore API.
  //

  getItems(context, type, itemIds) {
    return this._cache.getItemStore().then(itemStore => itemStore.getItems(context, type, itemIds));
  }

  queryItems(context, root, filter={}) {
    return this._cache.getItemStore().then(itemStore => itemStore.queryItems(context, root, filter));
  }
}

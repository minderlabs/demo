//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { ItemStore } from 'minder-core';

import { Cache } from './cache';

/**
 * User store.
 */
export class FirebaseSystemStore extends ItemStore {

  // TODO(burdon): Use FirebaseItemStore (no cache).

  // Root database node.
  static ROOT = 'system';

  /**
   * Parses the root node of the data set, inserting items into the item store.
   * @param itemStore
   * @param data
   */
  static parseData(itemStore, data) {
    let items = [];
    _.each(data.val(), (records, type) => {
      _.each(records, (item, id) => {
        items.push(item);
      });
    });

    itemStore.upsertItems({}, items);
  }

  /**
   * Converts a firebase User record to a User item.
   */
  static userRecordToItem(key, record) {
    // TODO(madadam): Credentials isn't part of the schema; needs to be?
    return {
      type:         'User',
      id:           key,
      created:      record.created,
      modified:     record.modified,
      title:        record.profile.name,
      email:        record.profile.email,
      credentials:  record.credentials
    };
  }

  constructor(db, idGenerator, matcher, namespace) {
    super(idGenerator, matcher, namespace);
    console.assert(db);

    this._db = db;
    this._cache = new Cache(
      this._db, FirebaseSystemStore.ROOT, idGenerator, matcher, namespace, FirebaseSystemStore.parseData);
  }

  clearCache() {
    return this._cache.getItemStore(true);
  }

  /**
   * Upsert Firebase User Account.
   * @param data
   */
  upsertUser(data) {
    let { user, credential } = data;
    let { uid, email, name } = user;
    let { accessToken, idToken, provider } = credential;
    console.assert(uid);

    // https://firebase.google.com/docs/database/web/read-and-write
    let record = {
      created: moment().unix(),

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

    this.upsertItem({}, FirebaseSystemStore.userRecordToItem(uid, record));
  }

  /**
   * Lookup group for user.
   * @param userId
   * @returns {Promise} Matching group (or null).
   */
  getGroup(userId) {
    // TODO(burdon): Return matching groups.
    return this.queryItems({}, {}, { type: 'Group' }).then(items => {
      return _.find(items, item => _.indexOf(item.members, userId) != -1);
    });
  }

  //
  // ItemStore interface.
  //

  upsertItems(context, items) {

    // Write-through cache.
    _.each(items, item => {
      console.assert(item.type && item.id);

      item.modified = moment().unix();

      // https://firebase.google.com/docs/database/web/read-and-write
      this._db.ref(FirebaseSystemStore.ROOT + '/' + item.type + '/' + item.id).set(item);
    });

    return this._cache.getItemStore().then(itemStore => itemStore.upsertItems(context, items));
  }

  getItems(context, type, itemIds) {
    return this._cache.getItemStore().then(itemStore => itemStore.getItems(context, type, itemIds));
  }

  queryItems(context, root, filter={}) {
    return this._cache.getItemStore().then(itemStore => itemStore.queryItems(context, root, filter));
  }
}

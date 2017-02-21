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
      title:        record.profile.displayName,
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
   * @param user
   * @param credential
   * @returns {Promise<User>}
   */
  registerUser(user, credential) {
    let { uid, email, displayName } = user;
    let { accessToken, idToken, provider } = credential;
    console.assert(uid);

    // https://firebase.google.com/docs/database/web/read-and-write
    let record = {
      created: moment().unix(),

      // Firebase user.
      profile: {
        uid,
        email,
        displayName
      },

      // OAuth credentials.
      credentials: {
        [Cache.sanitizeKey(provider)]: {
          accessToken,
          idToken
        }
      }
    };

    // Check if user is whitelisted.
    return this.getGroupByWhitelist(email).then(group => {
      console.log('Group:', _.pick(group, ['id', 'members', 'whitelist']), group);

      let user = FirebaseSystemStore.userRecordToItem(uid, record);

      // Active if in group.
      user.active = !!group;

      // TODO(burdon): Upsert each time?
      return this.upsertItem({}, user).then(user => {
        if (group) {
          let members = group.members || [];
          if (_.findIndex(members, user.id) == -1) {
            members.push(user.id);
            group.members = members;
            return this.upsertItem({}, group).then(group => {
              return user;
            });
          }
        }

        return Promise.resolve(user);
      });
    });
  }

  /**
   * Lookup group for user.
   * @param userId
   * @returns {Promise} Matching group (or null).
   */
  getGroup(userId) {
    // TODO(burdon): Return matching groups.
    return this.queryItems({}, {}, { type: 'Group' }).then(groups => {
      return _.find(groups, group => _.indexOf(group.members, userId) != -1);
    });
  }

  getGroupByWhitelist(email) {
    // TODO(burdon): Return matching groups.
    return this.queryItems({}, {}, { type: 'Group' }).then(groups => {
      return _.find(groups, group => _.indexOf(group.whitelist, email) != -1);
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

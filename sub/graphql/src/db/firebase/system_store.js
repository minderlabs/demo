//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { DelegateItemStore, Logger } from 'minder-core';

const logger = Logger.get('system');

/**
 * System Accounts store (Users and Groups).
 *
 * NOTE: This depends on Firebase authentication (and user representation) but not the firebase store.
 */
export class SystemStore extends DelegateItemStore {

  /**
   * Make legal firebase key.
   */
  static sanitizeKey(str) {
    return str.replace(/\W+/g, '_');
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

  constructor(itemStore) {
    super(itemStore);

    // TODO(burdon): Enforce all items have this bucket.
    this._context = {
      groupId: 'system'
    };
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
        [SystemStore.sanitizeKey(provider)]: {
          accessToken,
          idToken
        }
      }
    };

    // Check if user is whitelisted.
    return this.getGroupByWhitelist(email).then(group => {
      let user = SystemStore.userRecordToItem(uid, record);

      // Active if whitelisted.
      user.active = !_.isNil(group);

      // TODO(burdon): Upsert each time?
      return this.upsertItem({}, user).then(user => {

        // Add user to group.
        if (group && _.indexOf(group.members, user.id) == -1) {
          _.defaults(group, { members: [] });

          group.members.push(user.id);
          return this.upsertItem(this._context, group).then(group => {
            logger.info('Joined group: ' + JSON.stringify(_.pick(group, ['id', 'title', 'members'])));
            return user;
          });
        }

        return user;
      });
    });
  }

  /**
   * Lookup group for user.
   * @param userId
   * @returns {Promise} Matching group (or null).
   */
  getGroup(userId) {
    // TODO(burdon): Return multiple groups.
    return this.queryItems(this._context, {}, { type: 'Group' }).then(groups => {
      return _.find(groups, group => _.indexOf(group.members, userId) != -1);
    });
  }

  /**
   * Lookup group for whitelisted user email.
   * @param email
   * @returns {Promise} Matching group (or null).
   */
  getGroupByWhitelist(email) {
    // TODO(burdon): Return multiple groups?
    return this.queryItems(this._context, {}, { type: 'Group' }).then(groups => {
      return _.find(groups, group => _.indexOf(group.whitelist, email) != -1);
    });
  }
}

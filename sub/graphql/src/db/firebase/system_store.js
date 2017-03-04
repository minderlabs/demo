//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

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
  // TODO(burdon): Move to firebase.
  static sanitizeKey(str) {
    return str.replace(/\W+/g, '_');
  }

  constructor(itemStore) {
    super(itemStore);
    this._context = {
      groupId: 'system'
    };
  }

  /**
   * Get an existing user.
   * @param userId
   */
  getUser(userId) {
    return this.getItem(this._context, 'User', userId);
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
    // TODO(burdon): Return multiple groups.
    return this.queryItems(this._context, {}, { type: 'Group' }).then(groups => {
      return _.find(groups, group => _.indexOf(group.whitelist, email) != -1);
    });
  }

  /**
   * Checks if the user is a memeber of the group and if not adds it.
   * @param user
   * @param group
   * @return {*}
   */
  maybeAddUserToGroup(user, group) {
    if (_.indexOf(group.members, user.id) != -1) {
      return Promise.resolve(user);
    }

    _.defaults(group, { members: [] }).members.push(user.id);

    return this.upsertItem(this._context, group).then(group => {
      logger.log('User joined group: ' + JSON.stringify(_.pick(group, ['id', 'title'])));
      return user;
    });
  }

  /**
   * Converts a firebase User record to a User item.
   */
  static createUser(userInfo, credential) {
    console.assert(userInfo);
    let { uid, email, displayName } = userInfo;

    return SystemStore.updateUser({
      active: true,
      type: 'User',
      id: uid,
      title: displayName,
      email: email
    }, credential);
  }

  /**
   * Update the user record's credentials.
   * NOTE: The GraphQL User definition is a projection of part of this data.
   * For example, credentials are not exposed through the GQL API.
   */
  static updateUser(user, credential=undefined) {
    if (credential) {
      let { accessToken, idToken, provider } = credential;
      _.set(user, `credentials.${SystemStore.sanitizeKey(provider)}`, { accessToken, idToken });
    } else {
      user.active = false;
    }

    return user;
  }

  /**
   * Upsert Firebase User Account.
   *
   * Cases:
   * 1). New user is whitelisted in group => create active user.
   * 2). New user is not whitelisted => create non-active user and send waitlist email.
   * 3). Existing user authenticates => update authentication record.
   * 4). Existing inactive user authenticates and is now whitelisted => activate user.
   * 5). Existing user is already authenticated => return record.
   *
   * Errors:
   * A). User is authenticated but database record is missing.
   *
   * @param userInfo
   * @param credential
   * @returns {Promise<User>}
   */
  registerUser(userInfo, credential=undefined) {
    let { uid, email } = userInfo;
    console.assert(uid && email);

    //
    // Check of existing user.
    //
    return this.getUser(uid).then(user => {

      if (!user) {
        logger.log('Registering user: ' + JSON.stringify({ uid, email, provider: credential.provider }));
        let user = SystemStore.createUser(userInfo, credential);

        //
        // New user.
        // Check whitelisted in existing group (i.e., invited).
        //
        return this.getGroupByWhitelist(email).then(group => {

          // Active if whitelisted.
          user.active &= !_.isEmpty(group);

          // Create new user record.
          return this.upsertItem(this._context, user).then(user => {

            // Add user to group.
            if (user.active) {

              //
              // 1). Update group.
              //
              return this.maybeAddUserToGroup(user, group);
            } else {

              //
              // 2). Waitlist.
              // TODO(burdon): Send waitlist email?
              //
              logger.log('User not whitelisted: ' + JSON.stringify({ uid, email }));
              return user;
            }
          });
        });
      } else {

        if (credential) {

          //
          // 4). If not active, check if now whitelisted.
          //
          let promise = (user.active) ? Promise.resolve(user) : this.getGroupByWhitelist(email).then(group => {

            // Active if whitelisted.
            user.active = !_.isEmpty(group);

            return (user.active) ? this.maybeAddUserToGroup(user, group) : Promise.resolve(user);
          });

          //
          // 3). Update existing user's credentials.
          //
          return promise.then(user => this.upsertItem(this._context, SystemStore.updateUser(user, credential)))
            .then(user => {
              logger.log('Updated credentials: ' + JSON.stringify({ user: email, provider: credential.provider }));
              return user;
            });
        } else {

          //
          // 5). Get existing.
          //
          return user;
        }
      }
    });
  }
}

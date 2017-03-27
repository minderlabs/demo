//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { DelegateItemStore } from './item_store';

import Logger from '../util/logger';

const logger = Logger.get('system');

/**
 * System Accounts store (Users and Groups).
 *
 * NOTE: This depends on Firebase authentication (and user representation) but not the firebase store.
 */
export class SystemStore extends DelegateItemStore {

  // TODO(burdon): Namespace prefix Group/minderlabs_com/xxx, Group/system, etc?

  /**
   * Make legal firebase key.
   */
  static sanitizeKey(str) {
    console.assert(str);
    return str.replace(/\W+/g, '_');
  }

  /**
   * Create a User ID.
   *
   * @param provider
   * @param userId
   * @returns {string}
   */
  static createUserId(provider, userId) {
    console.assert(provider, userId);

    // TODO(burdon): Change to '/' (fix hierarchical keys for FirebaseItemStore).
    return SystemStore.sanitizeKey(provider) + '-' + userId;
  }

  constructor(itemStore) {
    super(itemStore);
    this._context = {
      groupId: 'system'
    };
  }

  /**
   * Get an existing user.
   *
   * @param userId
   */
  getUser(userId) {
    console.assert(userId);
    return this.getItem(this._context, 'User', userId);
  }

  /**
   * Get an existing user by email address.
   * @param email
   */
  getUserByEmail(email) {
    console.assert(email);
    return this.queryItems(this._context, {}, {
      type: 'User',
      expr: {
        // TODO(burdon): Should the user have an email field (only part of credentials? Multiple accounts?)
        field: 'email',
        value: {
          string: email
        }
      }
    }).then(items => {
      return items[0];
    });
  }

  /**
   * Update and existing user.
   * @param user
   * @return {Promise<Item>}
   */
  updateUser(user) {
    return this.upsertItem(this._context, user);
  }

  /**
   * Lookup group for user.
   * @param userId
   * @returns {Promise} Matching group (or null).
   */
  // TODO(burdon): getGroups.
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
   * Update the user record's credentials.
   * NOTE: The GraphQL User definition is a projection of part of this data.
   * For example, credentials are not exposed through the GQL API.
   */
  static updateUser(user, credentials=undefined) {
    if (credentials) {
      let { provider } = credentials;

      _.set(user, `credentials.${SystemStore.sanitizeKey(provider)}`, _.omit(credentials, ['provider']));
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
   * A). User is authenticated (JWT id_token still valid) but database record is missing (corrupt).
   *
   * @param userProfile
   * @param credentials
   * @param active
   *
   * @returns {Promise<User>}
   */
  // TODO(burdon): Register vs update?
  registerUser(userProfile, credentials, active=false) {
    console.assert(userProfile && credentials);
    let { id, email, displayName, photoUrl } = userProfile;
    console.assert(id && email, 'Invalid profile: ' + JSON.stringify(userProfile));
    let { provider } = credentials;
    console.assert(provider, 'Invalid credentials: ' + JSON.stringify(credentials));

    //
    // Check for existing user.
    //
    return this.getUser(SystemStore.createUserId(provider, id)).then(user => {
      if (!user) {

        // TODO(burdon): Handle no credentials (e.g., user record missing but authenticated).
        logger.log('Registering user: ' + JSON.stringify({ id, email }));

        let user = {
          type: 'User',
          id: SystemStore.createUserId(provider, id),
          active,
          email,
          displayName
        };

        // Optional values.
        _.assign(user, _.compact({ photoUrl }));

        // Set credentials.
        SystemStore.updateUserCredential(user, credentials);

        //
        // New user.
        // Check whitelisted in existing group (i.e., invited).
        //
        return this.getGroupByWhitelist(email).then(group => {
          if (!group) {
            user.active = false;
            logger.log('User not whitelisted: ' + JSON.stringify({ id, email }));
          } else {
            user.active = true;
          }

          // Create new user record.
          return this.updateUser(user).then(user => {
            // Add user to group.
            if (user.active) {

              //
              // 1). Update group.
              //
              return this.maybeAddUserToGroup(user, group);
            } else {

              //
              // 2). Waitlist.
              //
              return user;
            }
          });
        });
      } else {
        if (credentials) {

          //
          // 4). If not active, check if now whitelisted.
          //
          let promise = (user.active) ? Promise.resolve(user) : this.getGroupByWhitelist(email).then(group => {

            // Active if whitelisted.
            user.active = !_.isNil(group);
            return (user.active) ? this.maybeAddUserToGroup(user, group) : Promise.resolve(user);
          });

          //
          // 3). Update existing user's credentials.
          //
          return promise.then(user => this.updateUser(SystemStore.updateUserCredential(user, credentials)))
            .then(user => {
              logger.log('Updated credentials: ' + JSON.stringify({ email }));
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

  /**
   * Update the user record's credentials.
   * NOTE: The GraphQL User definition is a projection of part of this data.
   * For example, credentials are not exposed through the GQL API.
   * @param user
   * @param credentials OAuth credentials (https://tools.ietf.org/html/rfc6749#appendix-A).
   */
  static updateUserCredential(user, credentials=undefined) {
    if (credentials) {
      let { provider } = credentials;
      let key = `credentials.${SystemStore.sanitizeKey(provider)}`;

      // Merge credentials.
      // NOTE: refresh_token is only returned when first accessed.
      _.set(user, key, _.assign(_.get(user, key, {}), _.omit(credentials, 'provider')));
    } else {
      user.active = false;
    }

    return user;
  }
}

//
// Copyright 2016 Alien Laboratories, Inc.
//

// FIXME: Disentangle this from old API Database.
// Anything in here that we still need?
// * jwtToken, nope that was for auth to python API.
// * Database, nope, but we need SlackItemStore (QueryProvider) to do search. And the bot needs to have a graphql client
//   to get minder data.
// * UserState: not sure. per-user subscriptions in the slackbot client?

import { Database, HttpPollingChannel } from 'nx/data';
import { Url } from 'nx/util'; // FIXME

// TODO(burdon): Config is not defined.
import { Config } from '../config';
import { RenderParseHelper } from './render_parse.js'
import { UserState } from './user_state'

let jwt = require('jsonwebtoken');

/**
 * Constructs and caches UserState for active users, including persisting UserInfo,
 * which holds JWT tokens for Minder API authentication on behalf of the user.
 */
export class UserStateManager {

  /**
   * @param controller botkit controller, for storage.
   */
  constructor(controller, apiBase) {
    console.log('API base: ' + apiBase);
    this._controller = controller;

    this.apiBase = apiBase;

    // Cache of UserState per user, keyed by user_id.
    // TODO(madadam): Cache invalidation, timeout.
    this._userState = {};
  }

  /**
   * Load state and subscribe queries for all users on the team associated w/ bot.
   * @param bot, one team's bot.
   */
  loadUsers(bot) {
    this._controller.storage.users.all((err, userInfos) => {
      if (err) {
        throw new Error(err);
      }

      let promises = [];
      for (let userInfo of userInfos) {
        if (userInfo.payload.team == bot.config.id) {
          promises.push(this._getUserStateFor(userInfo, bot));
        }
      }

      Promise
        .all(promises, (results) => {
          console.log('Loaded states for ' + results.length + ' users.');
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }

  /**
   * get UserState for user, returning a Promise of UserState.
   * @param user
   * @param bot
   * @returns Promise of UserState.
   */
  getUserState(user, bot) {

    // Look for cached userInfo with jwt token.
    return new Promise((resolve, reject) => {
      this._controller.storage.users.get(user, (err, userInfo) => {
        if (userInfo && userInfo.jwtToken) {
          this._getUserStateFor(userInfo, bot).then((userState) => {
            resolve(userState);
          });
        } else {
          this.getUserInfoForUser(user, bot)
            .then((userInfo) => {
              this._getUserStateFor(userInfo, bot).then((userState) => {
                resolve(userState);
              })
            })
            .catch((err) => {
              reject(err);
            });
        }
      });
    });
  }

  /**
   * @param userInfo
   * @param bot
   * @returns Promise of UserState
   * @private
   */
  _getUserStateFor(userInfo, bot) {
    if (this._userState[userInfo.id]) {
      return Promise.resolve(this._userState[userInfo.id]);
    } else {
      let apiUrl = Url.of(this.apiBase, {
        Authorization: 'Bearer ' + userInfo.jwtToken
      });

      let database = new Database(new HttpPollingChannel(apiUrl, Config.apiPath));
      let userState = new UserState(userInfo, database, bot);
      this._userState[userInfo.id] = userState;

      // Get this user's Minder ID via an API call.
      let helper = new RenderParseHelper(userState);
      return helper.getUserFromSlackAccountId(userInfo.id)
        .then((minderId) => {
          userInfo.minderId = minderId;
          // TODO(madadam): Update userInfo cache with minderId.
          // this._controller.storage.users.save(userInfo, (err, id) => {...});
        })
        .catch((err) => {
          console.log('ERROR getting userId for ' + userInfo.id + ': ' + err);
        });
    }
  }

  /**
   * Request user info from the Slack API, create a JWT token for the user, and cache.
   * @param userId
   * @param bot
   * @return {Promise} Promise of UserInfo.
   */
  getUserInfoForUser(userId, bot) {
    return new Promise((resolve, reject) => {
      bot.api.users.info({
        user: userId
      }, (err, res) => {
        let payload = {
          service:  'slack.com',
          user:     userId,
          team:     res.user.team_id,
          email:    res.user.profile.email,
          name:     res.user.profile.real_name
        };

        let jwtToken = jwt.sign(payload, _.get(process.env, 'jwtSecret'));
        let userInfo = {
          id: userId, // Required for controller.storage.save.
          jwtToken: jwtToken,
          payload: payload
        };

        this._controller.storage.users.save(userInfo, (err, id) => {
          if (err) {
            reject(err)
          } else {
            resolve(userInfo);
          }
        });
      });
    });
  }
}


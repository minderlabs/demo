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
   *
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
    let self = this;
    this._controller.storage.users.all(function(err, userInfos) {
      if (err) {
        throw new Error(err);
      }
      let promises = [];
      for (let userInfo of userInfos) {
        if (userInfo.payload.team == bot.config.id) {
          promises.push(self._getUserStateFor(userInfo, bot));
        }
      }
      Promise.all(promises, function(results) {
        console.log('Loaded states for ' + results.length + ' users.');
      })
        .catch(function(err) {
          console.log('** ERROR: ' + err);
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
    let self = this;
    // Look for cached userInfo with jwt token.
    return new Promise(function(resolve, reject) {
      self._controller.storage.users.get(user, function(err, userInfo) {
        if (userInfo && userInfo.jwtToken) {
          self._getUserStateFor(userInfo, bot).then(function(userState) {
            resolve(userState);
          });
        } else {
          self.getUserInfoForUser(user, bot)
            .then(function(userInfo) {
              self._getUserStateFor(userInfo, bot).then(function(userState) {
                resolve(userState);
              })
            })
            .catch(function(err) {
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
    if (!this._userState[userInfo.id]) {
      let apiUrl = Url.of(this.apiBase, {
        Authorization: 'Bearer ' + userInfo.jwtToken
      });

      let database = new Database(new HttpPollingChannel(apiUrl, Config.apiPath));
      let userState = new UserState(userInfo, database, bot);
      this._userState[userInfo.id] = userState;

      // Get this user's Minder ID via an API call.
      let helper = new RenderParseHelper(userState);
      return helper.getUserFromSlackAccountId(userInfo.id)
        .then(function(minderId) {
          userInfo.minderId = minderId;
          // TODO(madadam): Update userInfo cache with minderId.
          // self._controller.storage.users.save(userInfo, function(err, id) {...});
        })
        .catch(function(err) {
          console.log('ERROR getting userId for ' + userInfo.id + ': ' + err);
        });
    }
    return Promise.resolve(this._userState[userInfo.id]);
  }

  // Request user info from the Slack API, create a JWT token for the user, and cache.
  // Return a Promise of UserInfo.
  getUserInfoForUser(userId, bot) {
    let self = this;
    return new Promise(function(resolve, reject) {
      bot.api.users.info({
        user: userId
      }, function(err, res) {
        let payload = {
          service: 'slack.com',
          user: userId,
          team: res.user.team_id,
          email: res.user.profile.email,
          name: res.user.profile.real_name
        };
        let jwtToken = jwt.sign(payload, process.env.jwtSecret);

        let userInfo = {
          id: userId, // Required for controller.storage.save.
          jwtToken: jwtToken,
          payload: payload
        };
        self._controller.storage.users.save(userInfo, function(err, id) {
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


/**
 * Created by madadam on 7/22/16.
 */

'use strict';

import { Defs, ItemUtil } from 'nx/data';

import { SlackItemSpecParser } from '../parser/parser';
import { ItemRenderer } from '../renderer/renderer';


/**
 * Manages backend API queries on behalf of a team, e.g. manages team-wide notification subscriptions.
 * Manages Parsers and Renderers that need to make Minder API calls.
 */
// NOTE: API queries need to be executed under some valid user, so we use the account of the user who
// created this bot, presumably the administrator. This may cause privacy leaks down the road, we may want
// to introduce a special team account with more restricted permissions for this purpose.
export class RenderParseHelper {
  constructor(userState) {
    this.userState = userState;

    this._itemSpecParser = new SlackItemSpecParser(this);
  }

  createSubscriptions() {
  }

  getItemSpecParser() {
    return this._itemSpecParser;
  }

  getItemRenderer(item, pretty=true, index=null) {
    return new ItemRenderer(item, this, pretty, index);
  }

  /**
   * Render a list of items from a query result into a json message with an attachment per item.
   *
   * @param queryResult
   * @param pretty
   * @returns Promise(jsonResponse) slack message with attachments.
   */
  renderResponse(queryResult, pretty=true) {
    let jsonResponse = {
      response_type: 'in_channel',
      text: 'Query results:'
    };

    let attachments = [];
    let self = this;
    (queryResult.item || []).forEach(function(item, i) {
      let renderer = self.getItemRenderer(item, pretty, i);
      attachments.push(renderer.renderItem());
    });
    return Promise.all(attachments).then(function(results) {
      if (results.length > 0) {
        jsonResponse.attachments = results;
      }
      return jsonResponse;
    });
  }

  /**
   *
   * @param userId Minder userId
   * @returns {Promise} of UserProto.
   */
  getUserFromMinderUserId(userId) {
    let query = {
      namespace: 'system',
      matchKey: [{
        type: 'user',
        id: userId
      }]
    };
    let results = {};
    let self = this;
    return new Promise(function(resolve, reject) {
      let errback = function(queryResult) {
        console.log('Error: ' + JSON.stringify(queryResult));
        reject(queryResult);
      };
      let callback = function(queryResult) {
        for (let item of queryResult.item || []) {
          let user = ItemUtil.getData(item, Defs.TYPE.user);
          if (user) {
            resolve(user);
            return;
          }
        }
        reject(queryResult);
      };
      self.userState.sendQuery(query, callback, errback);
    });
  }

  /**
   *
   * @param slackIds list of slack user Ids to map.
   * @returns {Promise} of minder userId. Could resolve to null if not found.
   */
  getUserFromSlackAccountId(slackId) {
    let query = {
      namespace: 'system',
      matchKey: [{
        type: 'account',
        namespace: 'slack.com',
        id: slackId
      }]
    };
    let result = null;
    let self = this;
    return new Promise(function(resolve, reject) {
      let errback = function(queryResult) {
        console.log('Error getting user id from slack id: ' + JSON.stringify(queryResult));
        reject(queryResult);
      };
      self.userState.sendQuery(query, function(queryResult) {
        // Assume there is only one result, take the first.
        for (let item of queryResult.item || []) {
          let account = ItemUtil.getData(item, Defs.TYPE.account);
          if (account && account.userId) {
            // FIXME return whole userproto.
            result = account.userId;
            break;
          }
        }
        resolve(result);
      }, errback);
    });
  }
}


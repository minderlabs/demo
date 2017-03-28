//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { QueryProcessor, Logger } from 'minder-core';

const logger = Logger.get('slack');


// TODO(madadam): Move to util.
class QueryUtil {

  /**
   *
   * @param filter FilterInput
   * @param key return the value for this key from filter.context's KeyValue pairs
   */
  static getContextKey(filter, key) {
    let value = null;
    _.each(_.get(filter, 'context', []), keyValue => {
      if (keyValue.key === key) {
        let types = _.keys(keyValue.value);
        if (types.length != 1) {
          throw new Error('ValueInput must have exactly one value: ' + JSON.stringify(types));
        }
        value = keyValue.value[types[0]];
        return false;
      }
    });
    return value;
  }

}

/**
 * SlackQueryProvider
 */
export class SlackQueryProcessor extends QueryProcessor {

  static NAMESPACE = 'slack.com';

  constructor(idGenerator, botManager) {
    super(SlackQueryProcessor.NAMESPACE);
    console.assert(idGenerator && botManager);
    this._idGenerator = idGenerator;
    this._botManager = botManager;
  }

  getBot() {
    // TODO(madadam): get bot by teamID, from context.user.credentials.slack.teamId
    // For demo, hard-code our Slack team:
    const botToken = 'xoxb-58769251330-HTpLu0jswjM8OmVLdKaDgJkC';
    return this._botManager.getBot(botToken);
  }

  /**
   * Convert Drive result to a schema object Item.
   *
   * @param idGenerator
   * @param match Slack API search result.
   * @returns Item
   * @private
   */
  static resultToItem(idGenerator, match) {
    return {
      namespace: SlackQueryProcessor.NAMESPACE,
      type: 'Document',
      id: idGenerator.createId(), // TODO(madadam): set foreign key -- permalink, or {channel.id}.{ts}.
      title: `@${match.username} on #${match.channel.name}: ${match.text}`,

      // TODO(madadam): Snippet.
      //snippet: match.text,
      url: match.permalink,
      iconUrl: '/img/slack-icon-24px.png'
    }
  }

  /**
   * Get a (possibly synthetic) Minder Contact item for each slack user.
   * If a corresponding Minder User object can be found (matching on email), include it as contact.user.
   *
   * @param slackUserIds array of slack user Ids.
   * @return {Promise} of array of Contact items.
   */
  convertToContactItems(bot, slackApiToken, slackUserIds) {
    // TODO(madadam): Batch API calls? I don't see any support for batch in Slack API docs.
    let promises = _.map(slackUserIds, slackUserId => {
      return this._botManager.slackbot.getSlackUserInfo(bot, slackApiToken, slackUserId)
        .then(userInfo => {
          let email = _.get(userInfo, 'profile.email');
          console.assert(email);
          let fullName = _.get(userInfo, 'profile.real_name',
            _.compact(_.at(userInfo, ['profile.first_name', 'profile.last_name'])).join(' '));
          // Synthesize ephemeral Contact item with foreign key.
          let contact = {
            type: 'Contact',
            namespace: SlackQueryProcessor.NAMESPACE,
            // TODO(madadam): generate random ID and stick this in fkey? See discussion in PR#81.
            id: userInfo.id, // Foreign key = slack user id.
            title: fullName, // TODO(madadam): displayName?
            email
          };

          return this._botManager.slackbot.getUserByEmail(email)
            .then(user => {
              if (user) {
                // Sanitize out internal stuff.
                contact.user = _.omit(user, ['credentials']);
              }
              return contact;
            });
        });
    });
    return Promise.all(promises);
  }

  /**
   *
   * @param slackChannelId
   * @return {Array}
   */
  getUsersForChannel(bot, slackApiToken, slackChannelId) {
    return new Promise((resolve, reject) => {
      bot.api.channels.info(
        { token: slackApiToken, channel: slackChannelId },
        (err, response) => {
          if (err) {
            reject(err);
          }
          resolve(_.get(response, 'channel.members', []));
        });
    });
  }

  //
  // QueryProcessor API.
  //

  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    let slackChannel = QueryUtil.getContextKey(filter, 'slack_channel');

    if (filter.text || !slackChannel) {
      return this._search(filter.text);
    } else {
      let bot = this.getBot();
      let slackApiToken = _.get(bot, 'config.incoming_webhook.token'); // same as bot.config.bot.app_token?

      // TODO(madadam): Get channel history to filter active/recent users; use slack bot's channel cache.
      return this.getUsersForChannel(bot, slackApiToken, slackChannel).then(slackUserIds => {
        return this.convertToContactItems(bot, slackApiToken, slackUserIds)
          .then(results => {
            return results;
          })
      });
    }
  }

  _search(query) {
    let bot = this.getBot();
    if (!bot || !query) {
      return Promise.resolve([]);
    }

    let items = [];
    const token = bot.config.incoming_webhook.token;
    return new Promise((resolve, reject) => {
      bot.api.search.all(
        { token: token, query: query },
        (err, response) => {
          if (err) {
            logger.error('Search failed:', err);
            reject(err);
          } else {
            _.each(response.messages.matches, match => {
              items.push(SlackQueryProcessor.resultToItem(this._idGenerator, match));
            });

            resolve(items);
          }
        });
    });
  }
}

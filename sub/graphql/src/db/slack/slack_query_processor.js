//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { QueryProcessor, Logger } from 'minder-core';

const logger = Logger.get('slack');

/**
 * SlackQueryProvider
 */
export class SlackQueryProcessor extends QueryProcessor {

  static NAMESPACE = 'slack.com';

  constructor(idGenerator, matcher, botManager) {
    super(idGenerator, matcher);
    this.botManager = botManager;
  }

  getBot() {
    // TODO(madadam): get bot by teamID, from context.user.credentials.slack.teamId
    // For demo, hard-code our Slack team:
    const botToken = 'xoxb-58769251330-HTpLu0jswjM8OmVLdKaDgJkC';

    return this.botManager.getBot(botToken);
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
      id: idGenerator.createId(), // TODO(madadam): keep Slack message ID as foreign key.
      title: `@${match.username} on #${match.channel.name}: ${match.text}`,

      // TODO(madadam): Snippet.
      //snippet: match.text,
      url: match.permalink,
      iconUrl: '/img/slack-icon-24px.png'
    }
  }

  //
  // QueryProcessor API.
  //

  get namespace() {
    return SlackQueryProcessor.NAMESPACE;
  }

  queryItems(context, root, filter={}, offset=0, count=10) {
    return this._search(filter.text);
  }

  _search(query) {
    let items = [];
    let bot = this.getBot();
    if (!bot || !query) {
      return Promise.resolve(items);
    }
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

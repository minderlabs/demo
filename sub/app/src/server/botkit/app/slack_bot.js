//
// Copyright 2016 Alien Laboratories, Inc.
//

import _ from 'lodash';

import { Database, Logger } from 'minder-core';
import { SlackQueryProcessor } from 'minder-graphql';

import { ActionDispatcher } from '../commands/action';
import { PasteCommand } from '../commands/paste';
import { QueryCommand } from '../commands/query';
import { DatabaseContext } from './database_context';

const logger = Logger.get('botkit');

// TODO(madadam): Unify all command parsing into one parser; use a single controller.hears clause. Or maybe
// let the parser do the "hearing", so we can dispatch commands and other ingestion operations more robustly
// than regex match.

// TODO(madadam): More actions:
// - archive
// - share|send, as followup after query:
//   "share that with @rich", "send that to @rich", or just "send @rich".
//   "send [ref] to @rich" (index ref)
// - edit|open [ref], same as button, opens item in app/crx.
// - subscribe [ref]
// - done [ref]
// - remind me to do [ref] [time spec], e.g. "remind me to do 3 next thursday"

// TODO(madadam): Subscriptions, deliver notifications.


/**
 * SlackBot is the main dispatcher for real-time chat interaction handlers (Commands and Actions).
 */
export class SlackBot {

  constructor(controller, database) {
    console.assert(controller && database);
    this.controller = controller;
    this.database = database;

    this.actionDispatcher = new ActionDispatcher();

    // Registered commands.
    this.commands = [
      new QueryCommand(),
      new PasteCommand(),
    ];
  }

  /**
   * Get Minder User object from UserStore, for slack userId.
   * @param slackUserId
   * @param bot
   * @param slackApiToken token for Slack API.
   * @return Promise of user object.
   */
  getUserInfo(slackUserId, bot, slackApiToken) {
    return this.getSlackUserInfo(slackUserId, bot, slackApiToken)
      .then(userInfo => {
        let email = _.get(userInfo, 'profile.email');
        let fullName = _.get(userInfo, 'profile.real_name',
          _.compact(_.at(userInfo, ['profile.first_name', 'profile.last_name'])).join(' '));
        let slackUserId = userInfo.id;
        console.assert(email);
        // TODO(madadam): Query userStore by email.
        // For now, iterate through all users in the UserStore (via Database).
        let filter = {
          type: 'User',
        };
        let queryProcessor = this.database.getQueryProcessor(Database.NAMESPACE.SYSTEM);
        console.assert(queryProcessor);
        return queryProcessor.queryItems({}, {}, filter)
          .then(items => {
            let user = _.find(items, { email });
            return user;
          });
      });
  }

  /**
   * Get a (possibly synthetic) Minder Contact item for a slack user.
   * If a corresponding Minder User object can be found (matching on email), include it as contact.user.
   *
   * @param slackUserId
   * @param bot
   * @param slackApiToken
   */
  getContactForSlackUser(slackUserId, bot, slackApiToken) {
    return this.getSlackUserInfo(slackUserId, bot, slackApiToken)
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

        // TODO(madadam): Query userStore by email.
        // For now, iterate through all users in the UserStore (via Database).
        let filter = {
          type: 'User',
        };
        let queryProcessor = this.database.getQueryProcessor(Database.NAMESPACE.SYSTEM);
        console.assert(queryProcessor);
        return queryProcessor.queryItems({}, {}, filter)
          .then(items => {
            let user = _.find(items, { email });
            if (user) {
              // Sanitize out internal stuff.
              contact.user = _.omit(user, ['credentials']);
            }
            return contact;
          });
      });
  }

  /**
   * Get Slack API user object, for slack userId.
   * @param slackUserId
   * @param bot
   * @param slackApiToken token for Slack API.
   * @return Promise of Slack user object.
   */
  getSlackUserInfo(slackUserId, bot, slackApiToken) {
    return new Promise((resolve, reject) => {
      bot.api.users.info(
        {token: slackApiToken, user: slackUserId},
        (err, response) => {
          if (err) {
            reject(err);
          }
          resolve(_.get(response, 'user'));
        });
    });
  }

  /**
   * Start listening for bot events.
   */
  start() {
    logger.info('Starting SlackBot.');

    // Simple ping for testing.
    this.controller.hears('hello', 'direct_message', (bot, message) => {
      bot.reply(message, 'hi there');
    });

    _.each(this.commands, command => {
      this.controller.hears(command.patterns(), command.eventTypes(), (bot, message) => {
        let slackUserId = message.user;
        let slackApiToken = _.get(bot, 'config.incoming_webhook.token'); // same as bot.config.bot.app_token?

        this.getUserInfo(slackUserId, bot, slackApiToken)
          .then(userInfo => {
            let context = {
              user: userInfo
            };

            let databaseContext = new DatabaseContext(this.database, context);

            try {
              command.run(bot, message, databaseContext);
            } catch(err) {
              logger.error('Error running ' + command.name() + ': ' + err);
              bot.reply(message, "Sorry, that didn't work.");
            }
          });
      });
    });

    this.controller.hears(['help$'], 'direct_message,direct_mention,mention', (bot, message) => {
      bot.reply(message, "working...");
      // TODO(madadam): Contextualize help based on recent history, selected items, etc.
      // TODO(madadam): Also get help strings from Actions.
      let helpStrings = [];
      _.each(this.commands, command => {
        helpStrings.push('  * ' + command.help());
      });
      let usage = _.join(helpStrings, "\n");
      bot.reply(message, 'After selecting one or more items, you can take the following actions:\n' + usage);
    });

    this.controller.on('interactive_message_callback', (bot, message) => {
      console.log('** MESSAGE CALLBACK, message: ' + JSON.stringify(message)); // FIXME
      let slackUserId = message.user;
      let slackApiToken = _.get(bot, 'config.incoming_webhook.token'); // same as bot.config.bot.app_token?

      this.getUserInfo(slackUserId, bot, slackApiToken)
        .then(userInfo => {
          let context = {
            user: userInfo
          };

          let databaseContext = new DatabaseContext(this.database, context);
          this.actionDispatcher.run(bot, message, databaseContext);
        });
    });

    // TODO(madadam): Decide what to use slash commands for, if anything.
    this.controller.on('slash_command', (bot, message) => {
      logger.info('Slash command Message: ' + JSON.stringify(message));
      bot.reply(message, 'hi from slash command');
    });
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import Botkit from 'botkit';
import express from 'express';

import { Logger } from 'minder-core';

import { SlackBot } from './slack_bot';

const logger = Logger.get('botkit');

/**
 * Wraps botkit controller, configures oauth endpoints, and sets up Slack app logic.
 */
export class BotKitManager {

  constructor(config, database) {
    this._config = config;
    this._database = database;

    // Cache the bots (and their RTM connections etc), keyed by bot token.
    this._bots = new Map();

    this.redirectUri = config.redirectHost + '/botkit/oauth';
    // Botkit logs the endpoints incorrectly when we bring our own express server.
    // TODO(madadam): Fix botkit logging upstream.
    logger.info('** Botkit logging below is wrong, true oauth redirect is: ' + this.redirectUri);

    this.controller = Botkit.slackbot({
      //debug: true
      debug: false,

      // TODO(madadam): Connect to persistent storage -- Firebase?
      // https://github.com/howdyai/botkit#writing-your-own-storage-module
      json_file_store: './var/botkit_storage/'
    });

    // Since we're bringing our own express server instead of calling controller.setUpWebServer(), we
    // need to set this manually. (Undocumented.)
    // https://github.com/howdyai/botkit#use-botkit-with-an-express-web-server
    this.controller.config.port = config.port;

    // https://github.com/howdyai/botkit/blob/master/readme-slack.md#controllercreateoauthendpoints
    this.controller.configureSlackApp({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: this.redirectUri,
      // NOTE: The incoming-webhook scope is needed to get a token that has permission to use scopes (e.g. search:read)
      // that aren't available to bot users. When making web API requests that need those scopes, access that token
      // via bot.config.incoming_webhook.token.
      // https://api.slack.com/bot-users#bot-methods
      scopes: ['commands', 'bot', 'incoming-webhook', 'search:read', 'users:read', 'users:read.email']
    });

    this.slackbot = new SlackBot(this.controller, this._database);
  }

  /**
   * Start handling controller signals for bot creation and startup.
   */
  start() {
    this.controller.on('create_bot', (bot, config) => {
      logger.info('Created bot with token: ' + JSON.stringify(config));
      this.startBot(bot).then(({ bot, isFirstConnect }) => {
        if (isFirstConnect) {
          bot.startPrivateConversation({ user: config.createdBy }, (err, conversation) => {
            if (err) {
              logger.error(err);
            } else {
              // TODO(madadam): Manage user-visible strings with an i18n-friendly string manager.
              conversation.say('I am a bot that has just joined your team');
              conversation.say('You must now /invite me to a channel so that I can do useful stuff!');
            }
          });
        }
      });
    });

    // Reconnect all teams on startup.
    this.controller.storage.teams.all((err, teams) => {
      if (err) {
        throw new Error(err);
      }

      _.each(teams, team => {
        if (team.bot) {
          // Spawn bot instance to represent specific bot identity for team (will appear online in Slack once connected).
          let bot = this.controller.spawn(team);
          this.startBot(bot).then(({ bot }) => {
            // TODO(madadam): Load bots for all users? Does anything need to happen here for credential management?
            //this.userStateManager.loadUsers(bot);
          });
        }
      });
    });

    this.slackbot.start();
  }

  /**
   * Connect the bot to Slack's Real-time Messaging (RTM) API and start listening on channels.
   * @param bot
   * @returns {Promise} of {bot, isFirstConnect).
   */
  startBot(bot) {
    return new Promise((resolve, reject) => {
      if (this._bots[bot.config.token]) {
        logger.info('Bot already registered for token: ' + bot.config.token);
        resolve({
          bot,
          isFirstConnect: false
        });
      } else {
        bot.startRTM((err) => {
          if (!err) {
            console.log('Connecting team: ' + JSON.stringify(bot.config));
            this._bots[bot.config.token] = bot;
            resolve({
              bot,
              isFirstConnect: true
            });
          } else {
            logger.error('Error connecting bot to Slack:', err);
            reject(err);
          }
        });
      }
    });
  }

  getBot(token) {
    return this._bots[token];
  }
}

/**
 * Express router for Slackbot-related endpoints.
 * @param botkitManager BotKitManager
 */
export const botkitRouter = (manager) => {
  let router = express.Router();

  manager.controller
    .createHomepageEndpoint(router)
    .createOauthEndpoints(router, function(err, req, res) {
      if (err) {
        res.status(500).send('ERROR: ' + err);
      } else {
        // Redirect.
        // TODO(madadam): redirect back to /accounts once account info is displayed for already-connected services.
        res.redirect('/');
      }
    })
    .createWebhookEndpoints(router);

  // TODO(madadam): Enable token verification after fixing the bug in botkit that breaks this for
  // interactive message buttons.
  //.createWebhookEndpoints(webserver, [_.get(process.env, 'slackVerificationToken')]);

  // Enable CORS support for all routes.
  // TODO(madadam): needed?
  //router.use(cors());

  manager.start();

  return router;
};

//
// Copyright 2016 Minder Labs.
//

import Botkit from 'botkit';
import express from 'express';

import { Logger } from 'minder-core';

const logger = Logger.get('botkit');

/**
 * Wraps botkit controller, configures oauth endpoints, and sets up Slack app logic.
 */
export class BotKitManager {
  constructor(config) {
    this.config = config;

    // Cache the bots (and their RTM connections etc), keyed by bot token.
    this._bots = {};

    this.redirectUri = config.redirectHost + '/botkit/oauth';
    // Botkit logs the endpoints incorrectly when we bring our own express server.
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
      scopes: ['commands', 'bot', 'incoming-webhook', 'search:read']
    });

    // TODO(madadam): port slackbot logic from framework:sub/botkit.
    // this.slackbot = new App(controller);
  }

  /**
   * Start handling controller signals for bot creation and startup.
   */
  start() {

    this.controller.on('create_bot', (bot, config) => {
      // TODO(madadam): promise and .then instead of callback?
      this.connect(bot, () => {

        bot.startPrivateConversation({user: config.createdBy}, (err, convo) => {
          if (err) {
            logger.error(err);
          } else {
            convo.say('I am a bot that has just joined your team');
            convo.say('You must now /invite me to a channel so that I can do useful stuff!');
          }
        });
      });
    });

    // Reconnect all teams on startup.
    this.controller.storage.teams.all((err, teams) => {
      if (err) {
        throw new Error(err);
      }

      for (let team of teams) {
        if (team.bot) {
          let bot = this.controller.spawn(team);
          this.connect(bot, () => {
            // TODO(madadam): Load bots for all users? Does anything need to happen here for credential management?
            //this.userStateManager.loadUsers(bot);
          });
        }
      }
    });

    // TODO(madadam): replace with full-blown slackbot app, ported from framework/sub/botkit/app.js
    // this.slackbot.start();

    // Simple ping for testing.
    this.controller.hears('hello', 'direct_message', function(bot, message) {
      bot.reply(message, 'Hi there');
    });

    this.controller.on('create_bot', function(bot, config) {
      // TODO(madadam): port BotManager from framework:sub/botkit.
      logger.info('Created bot with token: ' + JSON.stringify(config));
    });
  }

  connect(bot, onConnected=null) {
    if (this._bots[bot.config.token]) {
      logger.info('Bot already registered for token: ' + bot.config.token);
    } else {
      bot.startRTM((err) => {
        if (!err) {
          this._track(bot);
        } else {
          logger.error('Error connecting bot to Slack:', err);
        }
        if (onConnected) {
          onConnected();
        }
      });

    }
  }

  getBot(token) {
    return this._bots[token];
  }

  _track(bot) {
    console.log('Connecting team: ' + JSON.stringify(bot.config));
    this._bots[bot.config.token] = bot;
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
  //.createWebhookEndpoints(webserver, [process.env.slackVerificationToken]);

  // Enable CORS support for all routes.
  // TODO(madadam): needed?
  //router.use(cors());

  manager.start();

  return router;
};

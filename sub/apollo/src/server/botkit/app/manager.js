//
// Copyright 2016 Minder Labs.
//

import Botkit from 'botkit';
import express from 'express';

// FIXME combine with BotManager?

/**
 * Wraps botkit controller, configures oauth endpoints, and sets up Slack app logic.
 */
export class BotKitManager {
  constructor(config) {
    this.config = config;

    // Cache the bots (and their RTM connections etc), keyed by bot token.
    this._bots = {};

    // FIXME
    // process.env.OAUTH_REDIRECT_ROOT + '/botkit';
    this.redirectUri = 'http://localhost:3000' + '/botkit/oauth';
    console.log('*** BotKitManager redirectUri ' + this.redirectUri); // FIXME

    this.controller = Botkit.slackbot({
      //debug: true
      debug: false,

      // TODO(madadam): Connect to persistent storage -- Firebase?
      // https://github.com/howdyai/botkit#writing-your-own-storage-module
      json_file_store: './var/botkit_storage/'
    });

    // FIXME
    this.controller.config.hostname = 'localhost';
    this.controller.config.port = 3000;

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

    // FIXME: disentangle botManager etc from App
    // this.slackbot = new App(controller);
    // FIXME SlackItemStore, then register with database in main.js.
    // let slackItemStore = new SlackSearch(app.botManager);
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
            console.log(err);
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
            // FIXME Anything more needs to happen here for credential management?
            //this.userStateManager.loadUsers(bot);
          });
        }
      }
    });

    // FIXME replace with full-blown SlackApp, ported from framework/sub/botkit/app.js
    // this.slackbot.start();

    // Simple ping for testing.
    this.controller.hears('hello', 'direct_message', function(bot, message) {
      console.log('Message: ' + JSON.stringify(message));
      bot.reply(message, 'hi there');
    });

    this.controller.on('create_bot', function(bot, config) {
      // FIXME: port BotManager from framework:sub/botkit.
      console.log('** CREATE BOT: ' + JSON.stringify(config));
    });
  }

  connect(bot, onConnected=null) {
    if (this._bots[bot.config.token]) {
      // FIXME logger
      console.log('Bot already registered for token: ' + bot.config.token);
    } else {
      // FIXME minimal userstate needed to connect RTM bot?
      //let user = bot.config.createdBy;

      bot.startRTM((err) => {
        if (!err) {
          this._track(bot);
        } else {
          // FIXME logger
          console.log('Error connecting bot to Slack:', err);
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
        // FIXME where?
        res.redirect('/');
      }
    })
    .createWebhookEndpoints(router);
  // TODO(madadam): Enable token verification after fixing the bug in botkit that breaks this for
  // interactive message buttons.
  //.createWebhookEndpoints(webserver, [process.env.slackVerificationToken]);

  // Enable CORS support for all routes.
  // FIXME needed?
  //router.use(cors());

  manager.start();

  return router;
};

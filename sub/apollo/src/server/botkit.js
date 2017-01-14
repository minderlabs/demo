//
// Copyright 2017 Minder Labs.
//

import bodyParser from 'body-parser';
import Botkit from 'botkit';
import express from 'express';

import { SlackConfig } from '../common/defs';


// AccountManager handles service-specific accounts, each provided by an AccountHandler
// e.g. SlackAccountHandler.

// Sign up buttons can start oauth flow that redirects back to /accounts/<service>, which delegates to the
// service handler. After creating accounts (userStore?) and getting credentials from the service and
// storing them in the UserStore, the handler can redirect back to /accounts.

export class AccountManager {
  constructor() {
    this.handlers = new Map();
  }

  registerHandler(name, handler) {
    this.handlers[name] = handler;
  }
}

// Router for '/accounts' paths. Root /accounts page iterates over AccountManager.accounts exposing
// account.signUpButtons() if not already connected, or account.info() if connected.

export const accountsRouter = (accountManager) => {
  console.assert(accountManager);

  let router = express.Router();

  router.use(bodyParser.json());
  // TODO(madadam): use bodyParser.urlencoded?

  accountManager.handlers.forEach((name, handler) => {
    router.get('/accounts/' + name, handler.oauthRedirectHandler());
  });

  router.get('/accounts', function(req, res) {
    res.render('accounts', {
      accounts: accountManager.handlers
    });
  });

  return router;
};

// FIXME just an object instead of a class would do here.. what about other services?
export class SlackAccountHandler {
  name() {
    return 'Slack';
  }

  info() {
    return '<a href="/botkit/login"><img alt="Add to Slack" height=40 width="139" src="https://platform.slack-edge.com/img/add_to_slack.png"></a>';
  }
}

/*
// https://github.com/mvaragnat/botkit-express-demo
export class SlackAccountHandler {
  constructor(botKitController) {
    this.controller = botKitController;

    this.config = {
      slackRedirectUri: process.env.OAUTH_REDIRECT_ROOT + '/slack'
    };
  }

  name() { return 'slack'; }

  // FIXME: content for template.
  info() {

    // NOTE: The incoming-webhook scope is needed to get a token that has permission to use scopes (e.g. search:read)
    // that aren't available to bot users. When making web API requests that need those scopes, access that token
    // via bot.config.incoming_webhook.token.
    // https://api.slack.com/bot-users#bot-methods
    let scopes = _.join(['commands', 'bot', 'incoming-webhook', 'search:read'], ',');

    let slackButton = `<a href="https://slack.com/oauth/authorize?scope=${scopes}&client_id=${SlackConfig.clientId}"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>`;

    return slackButton;
  }

  oauthRedirectHandler() {
    return (req, res) => {
      console.log('================== START TEAM REGISTRATION =================='); // FIXME

      let authCode = req.query.code;

      if (!authCode){
        // user refused auth
        // TODO(madadam): Add an error message when redirecting, e.g. 'Failed to add Slack account.'
        res.redirect('/accounts');
      } else {
        this._exchangeAuthForTokens(authCode)
          .then(authResponse => {
            return this._registerTeam(authResponse);
          })
          .then(resultCode => {
            if (resultCode == 200) {
              // TODO(madadam): Add a message when redirecting, e.g. 'Slack account installed.'
              res.redirect('/accounts');
            }
          })
          .catch(error => {
            console.log('** Slack Auth failed: ' + error); // FIXME
            // TODO(madadam): Add an error message when redirecting, e.g. 'Failed to add Slack account.'
            res.redirect('/accounts');
          });
      }
    };
  }

  _exchangeAuthForTokens(authCode, res) {
    let authUrl = 'https://slack.com/api/oauth.access?';
    authUrl += 'client_id=' + SlackConfig.clientId;
    authUrl += '&client_secret=' + SlackConfig.clientSecret;
    authUrl += '&code=' + authCode;
    authUrl += '&redirect_uri=' + this.config.slackRedirectUri;

    return new Promise((resolve, reject) => {
      Request.get(authUrl, function (error, response, body) {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          let authResponse = JSON.parse(body);
          console.log('*** Auth response: ' + JSON.stringify(authResponse)); // FIXME

          resolve(authResponse);
        }
      })
    });
  }

  _registerTeam(auth) {
    // first, get authenticating user ID
    let url = 'https://slack.com/api/auth.test?';
    url += 'token=' + auth.access_token;

    // FIXME promisify request?
    // http://stackoverflow.com/questions/28308131/how-do-you-properly-promisify-request
    return new Promise((resolve, reject) => {
        Request.get(url, function(error, response, body) {
          if (error) {
            reject(error);
          } else {
            // FIXME
            try {
              let identity = JSON.parse(body);
              console.log(identity); // FIXME

              let team = {
                id: identity.team_id,
                bot: {
                  token: auth.bot.bot_access_token,
                  user_id: auth.bot.bot_user_id,
                  createdBy: identity.user_id
                },
                createdBy: identity.user_id,
                url: identity.url,
                name: identity.team
              };

              // FIXME do this in promise chain?
              startBot(team); // FIXME
              this._saveUser(auth, identity);

              // FIXME resolve tuple?
              resolve(auth, identity); // FIXME team?
            } catch (e) {
              // FIXME yuck. what errors is this catching?
              reject(e);
            }
          }
        });
      });
  }

  _saveUser(auth, identity) {
    // what scopes did we get approved for?
    let scopes = auth.scope.split(/\,/);

    // FIXME promise version? look at my current botkit code.
    this.controller.storage.users.get(identity.user_id, function(err, user) {
      isnew = false;
      if (!user) {
          isnew = true;
          user = {
              id: identity.user_id,
              access_token: auth.access_token,
              scopes: scopes,
              team_id: identity.team_id,
              user: identity.user,
          };
      }
      this.controller.storage.users.save(user, function(err, id) {
        if (err) {
          console.log('An error occurred while saving a user: ', err);
          this.controller.trigger('error', [err]);
        } else {
          if (isnew) {
            console.log("New user " + id.toString() + " saved");
          }
          else {
            console.log("User " + id.toString() + " updated");
          }
          console.log("================== END TEAM REGISTRATION ==================")
        }
      });
    });
  }
}
*/


/**
 * Wraps botkit controller, configures oauth endpoints, and sets up Slack app logic.
 */
export class BotKitManager {
  constructor() {
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
      clientId: SlackConfig.clientId,
      clientSecret: SlackConfig.clientSecret,
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

  start() {
    // FIXME replace with full-blown SlackApp, ported from framework/sub/botkit/app.js
    // this.slackbot.start();

    // Simple ping for testing.
    this.controller.hears('hello', 'direct_message', function(bot, message) {
      console.log('Message: ' + JSON.stringify(message));
      bot.reply(message, 'hi there');
    });
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

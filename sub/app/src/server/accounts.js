//
// Copyright 2017 Minder Labs.
//

import express from 'express';


// Sign-up buttons can start oauth flow that redirects back to /accounts/<service>, which delegates to the
// service handler. After creating accounts (systemStore?) and getting credentials from the service and
// storing them in the UserStore, the handler can redirect back to /accounts.

/**
 * AccountManager handles service-specific accounts, each provided by an AccountHandler
 * e.g. SlackAccountHandler.
 */
export class AccountManager {

  constructor() {
    this._handlers = new Map();
  }

  get handlers() {
    return this._handlers;
  }

  registerHandler(name, handler) {
    this._handlers[name] = handler;
    return this;
  }
}


/**
 * Router for '/accounts' paths. Root /accounts page iterates over AccountManager.accounts exposing
 * account.signUpButtons() if not already connected, or account.info() if connected.
 *
 * @param accountManager
 * @returns {core.Router|*}
 */
export const accountsRouter = (accountManager) => {
  console.assert(accountManager);

  let router = express.Router();

  accountManager.handlers.forEach((name, handler) => {
    let oauthHandler = handler.oauthRedirectHandler();
    if (oauthHandler) {
      router.get('/' + name, oauthHandler);
    }
  });

  router.get('/', function(req, res) {
    res.render('accounts', {
      accounts: accountManager.handlers
    });
  });

  return router;
};


/**
 * AccountHandler interface.
 */
export class AccountHandler {
  /**
   * Display name for the accounts management page.
   */
  name() { throw 'Not implemented'; }

  /**
   * Return a block of html for the /accounts management page.
   */
  infoHtml() { throw 'Not implemented'; }

  /**
   * Express route handler for oauth redirects. If implemented, installed at /accounts/<service_name>.
   */
  oauthRedirectHandler() { return null; }
}

export class SlackAccountHandler extends AccountHandler {
  name() {
    return 'Slack';
  }

  infoHtml() {
    return '<a href="/botkit/login"><img alt="Add to Slack" height=40 width="139" src="https://platform.slack-edge.com/img/add_to_slack.png"></a>';
  }

  // Botkit takes care of oauth for Slack.
  oauthRedirectHandler() { return null; }
}

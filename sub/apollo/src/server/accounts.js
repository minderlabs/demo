//
// Copyright 2017 Minder Labs.
//

import express from 'express';


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



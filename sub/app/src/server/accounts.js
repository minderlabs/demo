//
// Copyright 2017 Minder Labs.
//


// Sign-up buttons can start OAuth flow that redirects back to /accounts/<service>, which delegates to the
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
 * AccountHandler interface.
 */
export class AccountHandler {

  /**
   * Display name for the accounts management page.
   */
  name() { throw new Error('Not implemented'); }

  /**
   * Return a block of html for the /accounts management page.
   */
  infoHtml() { throw new Error('Not implemented'); }

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

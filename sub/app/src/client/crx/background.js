//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'net': Logger.Level.debug
}, Logger.Level.info);

import { ChromeMessageChannelDispatcher, Listeners, TypeUtil } from 'minder-core';

import { AuthManager, ConnectionManager, NetworkManager } from '../web/network';
import { ChromeNetworkInterface } from './util/network';
import { Notification } from './util/notification';
import { Settings } from './util/settings';

import { DefaultSettings } from './common';

/**
 * Background Page.
 */
class BackgroundApp {

  //
  // Initial config.
  //
  static Config = {
    env: 'development',
    app: {
      platform: 'crx'
    }
  };

  /**
   * Updates the config from stored settings (which may change).
   * NOTE: Allows update of muliple config params from settings.
   */
  static UpdateConfig(config, settings) {
    _.assign(config, settings, {
      graphql: settings.server + '/graphql',
      graphiql: settings.server + '/graphiql'
    });

    console.log('Config updated: ', JSON.stringify(config));
  }

  constructor() {
    // Initial configuration (dynamically updated).
    this._config = _.defaults({}, BackgroundApp.Config);

    // Dynamic settings.
    this._settings = new Settings(DefaultSettings);

    // Listens for client connections.
    this._dispatcher = new ChromeMessageChannelDispatcher();

    // Pop-ups.
    this._notification = new Notification();

    // Event listeners (for background state changes).
    this.onChange = new Listeners();

    this._user = null;

    //
    // Network.
    //

    this._networkManager = new NetworkManager(this._config);
    this._connectionManager = new ConnectionManager(this._config, this._networkManager);
    this._authManager = new AuthManager(this._config, this._networkManager, this._connectionManager);

    //
    // Listen for settings updates (not called on first load).
    //

    this._settings.onChange.addListener(settings => {

      // Check network settings (server) changes.
      let restart = this._config.server != settings.server;
      BackgroundApp.UpdateConfig(this._config, settings);

      if (restart) {
        this._networkManager.init();
        this._connectionManager.connect();

        // Broadcast reset to all clients (to reset cache).
        this._systemChannel.postMessage(null, {
          command: 'RESET'
        });
      }

      this.onChange.fireListeners();
    });

    //
    // Handle system requests/responses.
    //

    this._systemChannel = this._dispatcher.listen('system', request => {
      console.log('System request: ' + TypeUtil.stringify(request));
      switch (request.command) {

        // On client startup.
        // Send user ID from client registration.
        case 'REGISTER': {
          return Promise.resolve({
            command: 'registered',
            value: {
              user: this._user    // TODO(burdon): Get current user.
            }
          });
        }

        // Ping.
        case 'PING': {
          return Promise.resolve({ command: 'PONG', value: request.value });
        }
      }

      return Promise.resolve();
    });
  }

  /**
   * Access config from other pages.
   * @returns {object}
   */
  get config() {
    return this._config;
  }

  /**
   * On initialization we authenticate (get User ID from the server),
   * and then connect (get the Client ID from the server).
   *
   * AuthManager.authenticate()
   *   => firebase.auth().signInWithCredential()
   *     => ConnectionManager.connect()
   *       => ConnectionManager.register() => { client, user }
   *
   * Then start listening to client (context page) requests. The first request should be a 'REGISTER' command
   * on the system channel. We return to the client the current user ID.
   *
   * NOTE: For the web runtime, this isn't necessary since both the User ID and Client ID are known ahead of time.
   */
  init() {

    // Load the settings.
    this._settings.load().then(settings => {
      BackgroundApp.UpdateConfig(this._config, settings);

      // Initialize the network manager.
      this._networkManager.init();

      // Triggers popup.
      this._authManager.authenticate().then(user => {
        this._user = user;

        // Only show if not dev.
        if (!settings.server.startsWith('http://localhost')) {
          this._notification.show('Minder', 'Authentication succeeded.');
        }

        //
        // Proxy Apollo requests.
        // http://dev.apollodata.com/core/network.html#custom-network-interface
        // See also ChromeNetworkInterface
        // TODO(burdon): Logging (assign req
        //
        this._dispatcher.listen(ChromeNetworkInterface.CHANNEL, gqlRequest => {
          return this._networkManager.networkInterface.query(gqlRequest).then(gqlResponse => {
            return gqlResponse;
          });
        });

        // OK
        console.log('Listening...');
      });

      // TODO(burdon): Notify scripts.
      // Listen for termination and inform scripts.
      // https://developer.chrome.com/extensions/runtime#event-onSuspend
      chrome.runtime.onSuspend.addListener(() => {
        console.log('System going down...');
      });
    });

    return this;
  }
}

window.app = new BackgroundApp().init();

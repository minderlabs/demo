//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'net': Logger.Level.debug
}, Logger.Level.info);

import { ChromeMessageChannelDispatcher, Listeners, TypeUtil } from 'minder-core';

import { Const } from '../../common/defs';

import { ErrorHandler } from '../common/errors';
import { ClientAuthManager, ConnectionManager, NetworkManager } from '../common/network';
import { ChromeNetworkInterface } from './util/network';
import { Notification } from './util/notification';
import { Settings } from './util/settings';

import { BackgroundCommand, DefaultSettings } from './common';

/**
 * Background Page.
 *
 * The BackgroundApp multiplexes multiple Content Scripts (SidebarApps) and proxies server communication via a
 * dedicated "apollo" channel. It also sends and receives messages on a separate "system" channel.
 *
 *  _______________        ____________                 _______________        ________________________
 * |               |      |            | ==[system]==> |               |      |                        |
 * | ContentScript | ===> | SidebarApp |               | BackgroundApp | ===> | Express(graphqlRouter) |
 * |_______________|  |   |____________| ==[apollo]==> |_______________|  |   |________________________|
 *                    |                       |                           |
 *             (WindowMessenger)        (ChromeChannel)                   |
 *                                  (ChromeNetworkInterface)      (NetworkInterface)
 *
 * TODO(burdon): Cache and subscribe to live queries (via GQL directive).
 */
class BackgroundApp {

  //
  // Initial config.
  //
  static Config = {
    env: 'development',
    app: {
      platform: Const.PLATFORM.CRX
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

    // Registration state.
    this._registration = null;

    // Dynamic settings.
    this._settings = new Settings(DefaultSettings);

    // Listens for client connections.
    this._dispatcher = new ChromeMessageChannelDispatcher();

    // Pop-ups.
    this._notification = new Notification();

    // Error handler.
    ErrorHandler.handleErrors();

    //
    // Network.
    //
    this._networkManager = new NetworkManager(this._config);
    this._connectionManager = new ConnectionManager(this._config, this._networkManager);
    this._authManager = new ClientAuthManager(this._config, this._networkManager, this._connectionManager);

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
          command: BackgroundCommand.FLUSH_CACHE
        });
      }

      this.onChange.fireListeners();
    });

    //
    // Handle system requests/responses.
    //
    this._systemChannel = this._dispatcher.listen(BackgroundCommand.CHANNEL, request => {
      console.log('System request: ' + TypeUtil.stringify(request));
      switch (request.command) {

        // Ping.
        case BackgroundCommand.PING: {
          return Promise.resolve({
            timestamp: new Date().getTime()
          });
        }

        // On client startup.
        case BackgroundCommand.REGISTER: {
          let { server } = this._config;
          let registration = this._registration;
          if (!registration) {
            // TODO(burdon): Send retry error.
            return Promise.reject('Client not registered.');
          } else {
            return Promise.resolve({ registration, server });
          }
        }

        // TODO(burdon): Send updated registration to clients?
        case BackgroundCommand.RECONNECT: {
          this._networkManager.init();
          this._connectionManager.connect();
          break;
        }

        // Invalidate auth.
        // TODO(burdon): Triggers multiple reconnects (one more each time).
        case BackgroundCommand.SIGNOUT: {
          this._authManager.signout();
          break;
        }

        default:
          return Promise.reject('Invalid command.');
      }

      return Promise.resolve();
    });

    // Event listeners (for background state changes).
    this.onChange = new Listeners();
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
      this._authManager.authenticate().then(registration => {
        console.assert(registration && registration.userId);
        this._registration = registration;

        // Only show if not dev.
        // TODO(burdon): Option.
        if (!settings.server.startsWith('http://localhost')) {
          this._notification.show('Minder', 'Authentication succeeded.');
        }

        //
        // Proxy Apollo requests.
        // http://dev.apollodata.com/core/network.html#custom-network-interface
        // See also ChromeNetworkInterface
        // TODO(burdon): Network logging.
        //
        this._dispatcher.listen(ChromeNetworkInterface.CHANNEL, gqlRequest => {
          return this._networkManager.networkInterface.query(gqlRequest).then(gqlResponse => {
            return gqlResponse;
          });
        });
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

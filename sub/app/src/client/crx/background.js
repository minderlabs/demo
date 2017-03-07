//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'bg':         Logger.Level.debug,
  'auth':       Logger.Level.debug,
  'client':     Logger.Level.debug,
  'gcm':        Logger.Level.debug,
  'net':        Logger.Level.info
}, Logger.Level.info);

import { ChromeMessageChannelDispatcher, EventHandler, Listeners, QueryRegistry, TypeUtil } from 'minder-core';

import { Const } from '../../common/defs';

import { ErrorHandler } from '../common/errors';
import { AuthManager } from '../common/auth';
import { ConnectionManager } from '../common/client';
import { NetworkManager } from '../common/network';
import { GoogleCloudMessenger } from '../common/cloud_messenger';
import { ChromeNetworkInterface } from './util/network';
import { Notification } from './util/notification';
import { Settings } from './util/settings';

import { BackgroundCommand, DefaultSettings } from './common';

const logger = Logger.get('bg');

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

    // Error handler.
    ErrorHandler.handleErrors();

    //
    // Network.
    // ConnectionManager => AuthManager =>
    // NetworkManager => AuthManager.getToken()
    //

    this._eventHandler = new EventHandler();
    this._queryRegistry = new QueryRegistry();

    this._authManager = new AuthManager(this._config);

    this._cloudMessenger = new GoogleCloudMessenger(this._config, this._queryRegistry, this._eventHandler);
    this._connectionManager = new ConnectionManager(this._config, this._authManager, this._cloudMessenger);

    this._networkManager =
      new NetworkManager(this._config, this._authManager, this._connectionManager, this._eventHandler);

    //
    // Listen for settings updates (not called on first load).
    //

    this._settings.onChange.addListener(settings => {

      // Check network settings (server) changes.
      let restart = this._config.server != settings.server;
      BackgroundApp.UpdateConfig(this._config, settings);

      if (restart) {
        // Reset cache.
        this._networkManager.init();

        // Re-register with server.
        this._connectionManager.register().then(registration => {

          // Save registration.
          this._settings.set('registration', registration).then(() => {

            // Broadcast reset to all clients (to reset cache).
            this._systemChannel.postMessage(null, {
              command: BackgroundCommand.FLUSH_CACHE
            });
          });
        });
      }

      this.onChange.fireListeners();
    });

    //
    // Handle system requests/responses.
    //

    this._systemChannel = this._dispatcher.listen(BackgroundCommand.CHANNEL, request => {
      logger.log('System request: ' + TypeUtil.stringify(request));
      switch (request.command) {

        // Ping.
        case BackgroundCommand.PING: {
          return Promise.resolve({
            timestamp: new Date().getTime()
          });
        }

        // On client startup.
        // TODO(burdon): Race condition (sidebar opens before BG page is connected).
        case BackgroundCommand.REGISTER_APP: {
          let { server } = this._config;
          let registration = this._connectionManager.registration;
          if (!registration) {
            throw new Error('Not registered.');
          } else {
            return Promise.resolve({ registration, server });
          }
        }

        // TODO(burdon): Factor out with onChange above.
        case BackgroundCommand.REGISTER_CLIENT: {
          this._networkManager.init();
          return this._connectionManager.register();
        }

        // Invalidate auth.
        case BackgroundCommand.AUTHENTICATE: {
          return this._authManager.signout(true);
        }

        default: {
          throw new Error('Invalid command: ' + request.command);
        }
      }
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

    //
    // Load the settings into the configuration.
    // NOTE: This included the clientId.
    //
    this._settings.load().then(settings => {
      BackgroundApp.UpdateConfig(this._config, settings);
      logger.info(JSON.stringify(this._config));

      // Initialize the network manager.
      this._networkManager.init();

      // Triggers popup.
      this._authManager.authenticate(true).then(user => {

        // Register with server.
        this._connectionManager.register().then(registration => {
          logger.log('Registered: ' + JSON.stringify(registration));

          // Save registration.
          this._settings.set('registration', registration).then(() => {
            if (settings.notifications) {
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
        });
      });

      // TODO(burdon): Notify scripts.
      // Listen for termination and inform scripts.
      // https://developer.chrome.com/extensions/runtime#event-onSuspend
      chrome.runtime.onSuspend.addListener(() => {
        logger.log('System going down...');
      });
    });

    return this;
  }
}

window.app = new BackgroundApp().init();

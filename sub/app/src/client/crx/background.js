//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'net': Logger.Level.info
}, Logger.Level.debug);

import moment from 'moment';

import { Async, ChromeMessageChannelDispatcher, ErrorUtil, EventHandler, Listeners, TypeUtil } from 'minder-core';

import { Const } from '../../common/defs';

import { AuthManager } from '../common/auth';
import { ConnectionManager } from '../common/client';
import { NetworkManager, ChromeNetworkInterface } from '../common/network';
import { GoogleCloudMessenger } from '../common/cloud_messenger';
import { Notification } from './util/notification';
import { Settings } from './util/settings';

import { SystemChannel, DefaultSettings } from './common';

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
   * @returns {boolean} true if reconnect is needed (e.g., server changed).
   */
  static UpdateConfig(config, settings) {
    let restart = config.server !== settings.server;

    _.assign(config, settings, {
      graphql: settings.server + '/graphql',
      graphiql: settings.server + '/graphiql'
    });

    return restart;
  }

  constructor() {
    // Initial configuration (dynamically updated).
    this._config = _.defaults({}, BackgroundApp.Config);

    // Dynamic settings.
    this._settings = new Settings(DefaultSettings);

    // Listens for client connections.
    this._dispatcher = new ChromeMessageChannelDispatcher();

    // Errors and notifications.
    this._notification = new Notification();
    this._eventHandler = new EventHandler();

    ErrorUtil.handleErrors(window, error => {
      logger.error(error);
      this._eventHandler.emit({
        type: 'error',
        message: ErrorUtil.message(error)
      });
    });

    //
    // Network.
    // ConnectionManager => AuthManager =>
    // NetworkManager => AuthManager.getToken()
    //

    this._authManager = new AuthManager(this._config);

    this._cloudMessenger = new GoogleCloudMessenger(this._config, this._eventHandler).listen(message => {

      // Push invalidation to clients.
      this._systemChannel.postMessage(null, {
        command: SystemChannel.INVALIDATE
      });
    });

    this._connectionManager = new ConnectionManager(this._config, this._authManager, this._cloudMessenger);

    this._networkManager =
      new NetworkManager(this._config, this._authManager, this._connectionManager, this._eventHandler);

    // Channel for system messages between components.
    this._systemChannel = null;

    // Event listeners (for background state changes).
    this._onChange = new Listeners();
  }

  /**
   * Access config from other pages.
   * @returns {object}
   */
  get config() {
    return this._config;
  }

  /**
   * Expose collection of listeners.
   * @returns {Listeners}
   */
  get onChange() {
    return this._onChange;
  }

  /**
   * Authenticates and then registers the app.
   * If successful, starts listening for system and graphql channel requests from other components.
   */
  init() {

    //
    // Load the settings into the configuration.
    // NOTE: This included the clientId.
    //
    return this._settings.load()
      .then(settings => {
        BackgroundApp.UpdateConfig(this._config, settings);

        //
        // Listen for settings updates (e.g., from options page).
        //
        this._settings.onChange.addListener(settings => {
          let reconnect = BackgroundApp.UpdateConfig(this._config, settings);
          if (reconnect) {
            return this.connect();
          }
        });

        // Initialize the network manager.
        this._networkManager.init();

        // Retry until succeeds.
        return Async.retry(() => {

          // May trigger Auth dialog.
          return this._authManager.authenticate().then(userProfile => {

            // Register with server.
            return this.connect();
          });
        }).then(() => {

          //
          // Handle system requests from other components (e.g., sidebar).
          //
          this._systemChannel = this._dispatcher.listen(SystemChannel.CHANNEL, this.onSystemCommand.bind(this));

          //
          // Proxy GraphQL requests from other components (e.g., sidebar).
          // http://dev.apollodata.com/core/network.html#custom-network-interface
          // See also ChromeNetworkInterface
          //
          this._dispatcher.listen(ChromeNetworkInterface.CHANNEL, request => {
            return this._networkManager.networkInterface.query(request);
          });
        });
      })
      .then(() => {
        return this;
      });
  }

  /**
   *
   * @returns {Promise<Registration>}
   */
  connect() {
    // Flush the cache.
    this._networkManager.init();

    // Re-register with server.
    return this._connectionManager.register().then(client => {
      logger.log('Registered: ' + TypeUtil.stringify(client));
      if (_.get(this._config, 'settings.notifications')) {
        this._notification.show('Minder', 'Registered App.');
      }

      // Save registration.
      this._settings.set('client', client).then(() => {

        // Broadcast reset to all clients (to reset cache).
        this._systemChannel.postMessage(null, {
          command: SystemChannel.RESET
        });

        // Notify state changed.
        this._onChange.fireListeners();
        return client;
      });
    });
  }

  /**
   * Handle system message (from other components: sidebar, options, etc.)
   * @param request
   * @returns {*}
   */
  onSystemCommand(request) {
    logger.log('System request: ' + TypeUtil.stringify(request));
    switch (request.command) {

      // Ping.
      case SystemChannel.PING: {
        return Promise.resolve({
          // TODO(burdon): Factor out Util.
          timestamp: Date.now()
        });
      }

      // Re-authenticate user.
      case SystemChannel.AUTHENTICATE: {
        return this._authManager.signout(true);
      }

      // Re-connect client.
      case SystemChannel.CONNECT: {
        return this.connect();
      }

      // On sidebar startup.
      case SystemChannel.REGISTER: {
        let server = _.get(this._config, 'server');
        let userProfile = _.get(this._config, 'userProfile');
        if (!userProfile) {
          // TODO(burdon): Test client retry.
          // TODO(burdon): Shouldn't be an exception: return backoff/retry request.
          throw new Error('Not registered.');
        } else {
          return Promise.resolve({ userProfile, server });
        }
      }

      default: {
        throw new Error('Invalid command: ' + request.command);
      }
    }
  }
}

window.app = new BackgroundApp();
window.app.init().then(app => {
  logger.info('Initialized: ' + moment().format('YYYY-MM-DD HH:mm Z') + '\n' + TypeUtil.stringify(app.config, 2));

  // Listen for termination and inform scripts.
  // https://developer.chrome.com/extensions/runtime#event-onSuspend
  chrome.runtime.onSuspend.addListener(() => {
    // TODO(burdon): Notify other components.
    logger.warn('System going down...');
  });
});

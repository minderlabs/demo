//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'net': Logger.Level.debug
}, Logger.Level.info);

import { ChromeMessageChannelDispatcher, TypeUtil } from 'minder-core';

import { AuthManager, ConnectionManager, NetworkManager } from '../web/network';
import { ChromeNetworkInterface } from './util/network';

/**
 * Background Page.
 */
class BackgroundApp {

  // TODO(burdon): React dashboard: clients, messages.

  constructor() {
    this._dispatcher = new ChromeMessageChannelDispatcher();

    const config = {
      app: {
        platform: 'crx'
      },

      // TODO(burdon): Get from settings store.
      server: 'http://localhost:3000',
      graphql: 'http://localhost:3000/graphql',
    };

    // TODO(burdon): Event listener.
    let networkManager = new NetworkManager(config);
    let connectionManager = new ConnectionManager(config, networkManager);

    this.authManager = new AuthManager(config, networkManager, connectionManager);

    this.networkInterface = networkManager.networkInterface;
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
   * Then start listening to client (context page) requests. The first request should be a 'register' command
   * on the system channel. We return to the client the current user ID.
   *
   * NOTE: For the web app, this isn't necessary since both the User ID and Client ID are known ahead of time.
   */
  init() {

    // Triggers popup.
    this.authManager.authenticate().then(user => {

      //
      // Handle system request.
      //
      this._systemChannel = this._dispatcher.listen('system', request => {
        console.log('System request: ' + TypeUtil.stringify(request));
        switch (request.command) {

          // On client startup.
          // Send user ID from client registration.
          case 'register': {
            return Promise.resolve({
              command: 'registered',
              value: {
                user
              }
            });
          }

          // Ping.
          case 'ping': {
            return Promise.resolve({ command: 'pong', value: request.value });
          }
        }

        return Promise.resolve();
      });

      //
      // Proxy Apollo requests.
      // http://dev.apollodata.com/core/network.html#custom-network-interface
      // See also ChromeNetworkInterface
      // TODO(burdon): Logging (assign req
      //
      this._dispatcher.listen(ChromeNetworkInterface.CHANNEL, gqlRequest => {
        return this.networkInterface.query(gqlRequest).then(gqlResponse => {
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
  }
}

new BackgroundApp().init();

//
// Copyright 2017 Minder Labs.
//

import { ChromeMessageChannelDispatcher } from 'minder-core';

import { AuthManager, ConnectionManager, NetworkManager } from '../web/network';
import { ChromeNetworkInterface } from './util/network';

/**
 * Background Page.
 */
class BackgroundApp {

  constructor() {
    this._dispatcher = new ChromeMessageChannelDispatcher();

    const config = {
      app: {
        platform: 'crx'
      },

      server: 'http://127.0.0.1:3000',

      // TODO(burdon): Get from settings.
      graphql: 'http://127.0.0.1:3000/graphql',
    };

    // TODO(burdon): Event listener.
    let networkManager = new NetworkManager(config);
    let connectionManager = new ConnectionManager(config, networkManager);

    this.authManager = new AuthManager(config, networkManager, connectionManager);

    this.networkInterface = networkManager.networkInterface;
  }

  init() {

    // Triggers popup.
    // TODO(burdon): Don't start listening until this is running (may need to buffer?)
    this.authManager.authenticate().then(() => {

      //
      // Handle system request.
      //
      this._dispatcher.listen('system', request => {
        switch (request.command) {
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
      //
      this._dispatcher.listen(ChromeNetworkInterface.CHANNEL, gqlRequest => {
        console.log('>>>>>>', gqlRequest);
        return this.networkInterface.query(gqlRequest).then(gqlResponse => {
          console.log('<<<<<<', gqlResponse);
          return gqlResponse;
        });
      });

      console.log('Listening...');
    });
  }
}

new BackgroundApp().init();

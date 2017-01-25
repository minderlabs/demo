//
// Copyright 2017 Minder Labs.
//

import { ChromeMessageChannelDispatcher, ChromeNetworkInterface } from './util/network';

/**
 * Background Page.
 */
class BackgroundApp {

  constructor() {
    this._dispatcher = new ChromeMessageChannelDispatcher();
  }

  // TODO(burdon): NetworkInterfaceProxy

  init() {
    this._dispatcher.listen(ChromeNetworkInterface.CHANNEL, (request) => {
      console.log('<<<<<<<<<<<<<<<<<<<<<<', request);

      return Promise.resolve({});
    });
  }
}

new BackgroundApp().init();

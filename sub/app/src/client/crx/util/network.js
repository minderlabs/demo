//
// Copyright 2017 Minder Labs.
//

/**
 * Implements the Apollo NetworkInterface to proxy requests to the background page.
 *
 * http://dev.apollodata.com/core/network.html#custom-network-interface
 */
export class ChromeNetworkInterface {

  static CHANNEL = 'apollo';

  /**
   * Creates the network interface with the given Chrome channel (to the BG page).
   *
   * @param channel
   * @param eventHandler
   */
  constructor(channel, eventHandler=undefined) {
    console.assert(channel);
    this._channel = channel;
    this._eventHandler = eventHandler;
  }


  /**
   * Proxy request through the message sender.
   *
   * @param {GraphQLRequest} gqlRequest
   * @return {Promise<GraphQLResult>}
   */
  query(gqlRequest) {
    this._eventHandler && this._eventHandler.emit({ type: 'network.out' });
    return this._channel.postMessage(gqlRequest).wait().then(gqlResponse => {
      this._eventHandler && this._eventHandler.emit({ type: 'network.in' });
      return gqlResponse;
    });
  }
}

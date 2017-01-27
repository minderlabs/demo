//
// Copyright 2017 Minder Labs.
//

/**
 * http://dev.apollodata.com/core/network.html#custom-network-interface
 */
export class ChromeNetworkInterface {

  static CHANNEL = 'apollo';

  /**
   *
   * @param channel
   * @param eventHandler
   */
  constructor(channel, eventHandler=undefined) {
    console.assert(channel);
    this._channel = channel;
    this._eventHandler = eventHandler;
  }

  init() {
    // TODO(burdon): Config re-connect.
    this._channel.connect();
    return this;
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

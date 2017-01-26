//
// Copyright 2017 Minder Labs.
//

/**
 * http://dev.apollodata.com/core/network.html#custom-network-interface
 */
export class ChromeNetworkInterface {

  static CHANNEL = 'apollo';

  constructor(channel) {
    console.assert(channel);
    this._channel = channel;
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
    return this._channel.postMessage(gqlRequest).wait().then(gqlResponse => {
      return gqlResponse;
    });
  }
}

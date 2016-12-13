//
// Copyright 2016 Minder Labs.
//

const logger = Logger.get('sub');

/**
 * Manage queries.
 */
export class QueryRegistry {

  // http://dev.apollodata.com/core/apollo-client-api.html#QuerySubscription

  constructor() {
    this._registered = new Map();
  }

  // TODO(burdon): Unregister.
  register(component, data) {
    this._registered.set(component, data);
  }

  /**
   * Manually refetch registered queries.
   */
  invalidate() {
    logger.log(`Refetch: ${this._registered.size}`);
    this._registered.forEach((data, component) => {
      data.refetch();
    });
  }
}

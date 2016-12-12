//
// Copyright 2016 Minder Labs.
//

import Logger from 'js-logger';

const logger = Logger.get('net');

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
    logger.debug('Refetch: %d', this._registered.size);
    this._registered.forEach((data, component) => {
      data.refetch();
    });
  }
}

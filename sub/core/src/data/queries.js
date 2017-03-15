//
// Copyright 2016 Minder Labs.
//

import Logger from '../util/logger';

const logger = Logger.get('sub');

/**
 * Manage queries.
 */
export class QueryRegistry {

  static createId() {
    return _.uniqueId('S-');
  }

  // TODO(burdon): Factor out (move to minder-core).
  // http://dev.apollodata.com/core/apollo-client-api.html#QuerySubscription

  constructor() {
    this._components = new Map();
  }

  /**
   * Register query subscription.
   * @param id
   * @param refetch
   */
  register(id, refetch) {
    console.assert(id && refetch);
    this._components.set(id, { refetch });
    logger.log(`Registered[${this._components.size}]: ${id}`);
  }

  /**
   * Unregister query.
   * @param id
   */
  unregister(id) {
    console.assert(id);
    this._components.delete(id);
    logger.log(`Unregistered[${this._components.size}]: ${id}`);
  }

  /**
   * Manually refetch registered queries.
   */
  invalidate() {
    logger.log(`Refetch: ${this._components.size}`);
    this._components.forEach((reg, component) => {
      reg.refetch();
    });
  }
}

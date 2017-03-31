//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import Logger from '../util/logger';

const logger = Logger.get('sub');

/**
 * Manage queries.
 */
export class QueryRegistry {

  // HOC.
  static subscribe() {}

  static createId() {
    return _.uniqueId('S-');
  }

  // TODO(burdon): Factor out (move to minder-core).
  // http://dev.apollodata.com/core/apollo-client-api.html#QuerySubscription

  constructor(config) {
    console.assert(config);
    this._config = config;
    this._components = new Map();
  }

  /**
   * Register query subscription.
   * @param id
   * @param refetch
   */
  register(id, refetch) {
    console.assert(id);
    console.assert(refetch, 'Component must have refetch prop.');
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
    if (_.get(config, 'options.invalidate')) {
      logger.log(`Refetching queries: ${this._components.size}`);
      this._components.forEach(registration => {
        registration.refetch();
      });
    }
  }
}

/**
 * Wraps Component adding subscriptions.
 * The component must expose a graphql options.props.refetch() method.
 *
 * HOC: https://facebook.github.io/react/docs/higher-order-components.html
 */
export const SubscriptionWrapper = (Component) => {

  // TODO(burdon): Subscriptions?
  // addGraphQLSubscriptions(networkInterface, wsClient) SubscriptionNetworkInterface
  // http://dev.apollodata.com/react/subscriptions.html
  // https://github.com/apollographql/graphql-subscriptions
  // https://dev-blog.apollodata.com/a-proposal-for-graphql-subscriptions-1d89b1934c18#.23j01b1a4

  return class extends React.Component {

    static defaultProps = {
      cid: QueryRegistry.createId()
    };

    static contextTypes = {
      queryRegistry: React.PropTypes.object.isRequired
    };

    componentWillMount() {
      let { cid, refetch } = this.props;
      this.context.queryRegistry.register(cid, refetch);
    }

    componentWillUnmount() {
      let { cid } = this.props;
      this.context.queryRegistry.unregister(cid);
    }

    render() {
      return <Component { ...this.props }/>
    }
  }
};

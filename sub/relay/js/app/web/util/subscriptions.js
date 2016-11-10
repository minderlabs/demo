//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

/**
 * Relay container info.
 */
class ContainerInfo {

  constructor(containerConstructor) {
    this.containerConstructor = containerConstructor;
    this.containerInstances = new Set();
    this.fragments = new Set();
  }
}

/**
 * Manages Relay subscriptions.
 */
export default class SubscriptionManager {

  // Container constructors mapped by component type.
  static _containers = new Map();

  /**
   * Manage Relay container.
   *
   * @param componentType
   * @param containerConstructor
   * @returns {*}
   */
  // TODO(burdon): Monkey patch Relay.createContainer?
  static manage(componentType, containerConstructor) {
    let info = new ContainerInfo(containerConstructor);

    // TODO(burdon): Registry query based on @subscription tag.
    // https://facebook.github.io/relay/docs/api-reference-relay-container.html#overview
    // https://github.com/facebook/relay/blob/master/src/container/RelayContainer.js
    // https://github.com/facebook/relay/blob/master/src/query/RelayFragmentReference.js
    this._containers.set(componentType, info);

    _.map(containerConstructor.getFragmentNames(), (name) => {
      let fragment = containerConstructor.getFragment(name).getFragmentUnconditional();
      _.each(fragment.directives || [], (directive) => {
        if (directive.name == 'subscription') {
          info.fragments.add(name);
        }
      });
    });

    console.log('MANAGER: %s => {%s}',
      containerConstructor.displayName, Array.from(info.fragments.values()).join(','));

    return containerConstructor;
  }

  get info() {
    return {
      subscriptions: _.map(
        Array.from(SubscriptionManager._containers.values()), info => info.containerConstructor.displayName)
    };
  }

  /**
   * Component hierarchy:
   *
   * ReactComponent: {
   *   _reactInternalInstance: ReactCompositeComponentWrapper {
   *     debugID: number
   *   }
   *   context
   *   props: {
   *     relay: RelayContainer
   *   }
   *   refs
   *   state
   * }
   *
   * RelayContainer {
   *   props
   *   refs: {
   *     relayContainer: ReactComponent
   *   }
   *   state: {
   *     queryData
   *     rawVariables
   *   }
   * }
   *
   * @param componentType
   * @param container
   */
  subscribe(componentType, container) {
    let info = SubscriptionManager._containers.get(componentType);
    console.log('SUBSCRIBE: %s', info.containerConstructor.displayName);

    // Register instance of container.
    info.containerInstances.add(container);
  }

  /**
   * Invalidate subscriptions (either manually or from server).
   */
  invalidate() {
    SubscriptionManager._containers.forEach((info) => {
      console.log('INVALIDATE: %s', info.containerConstructor.displayName);

      // TODO(burdon): Match query to invalidation ID.
      info.containerInstances.forEach((container) => {
        container.forceFetch();
      });
    });
  }
}

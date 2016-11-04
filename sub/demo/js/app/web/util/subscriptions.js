//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * Manages Relay subscriptions.
 */
export default class SubscriptionManager {

  constructor() {
    this._subscriptions = new Map();
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
   *     component: ReactComponent
   *   }
   *   state: {
   *     queryData
   *     rawVariables
   *   }
   * }
   *
   * @param relayContainer
   */
  subscribe(relayContainer) {
    let component = relayContainer.refs.component;
    let id = component._reactInternalInstance._debugID;

    // TODO(burdon): Actually registry query.
    console.log('SUBSCRIBE: [%s:%d]', component.constructor.name, id);
    this._subscriptions.set(id._debugID, component);
  }

  invalidate() {
    this._subscriptions.forEach((component) => {
    let id = component._reactInternalInstance._debugID;
      let relayContainer = component.props.relay;

      // TODO(burdon): Actually match query to invalidation.
      console.log('INVALIDATE: [%s:%s]', component.constructor.name, id);
      relayContainer.forceFetch();
    });
  }
}

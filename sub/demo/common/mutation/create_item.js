//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

/**
 * Creates new item.
 */
export default class CreateItemMutation extends Relay.Mutation {

  // TODO(burdon): Reuse for mutation?

  static fragments = {
    user: () => Relay.QL`
      fragment on User {
        id
      }
    `
  };

  getMutation() {
    return Relay.QL`mutation { createItemMutation }`;
  }

  getVariables() {
    return {
      title: this.props.title
    };
  }

  getFatQuery() {
    return Relay.QL`
      fragment on CreateItemMutationPayload @relay(pattern: true) {
        user {
          items {
            edges {
              node {
                id,
                title
              }
            }
          }
        }
        createItemEdge
      }
    `;
  }

  // TODO(burdon): Multiple parents and edges?
  // https://facebook.github.io/relay/docs/guides-mutations.html#range-add
  getConfigs() {
    return [{
      type: 'RANGE_ADD',
      parentName: 'user',
      parentID: this.props.user.id,
      connectionName: 'items',
      edgeName: 'createItemEdge',
      rangeBehaviors: {
        '': 'append',
        'orderby(oldest)': 'prepend'
      }
    }];
  }

  getOptimisticResponse() {
    return {
      createItemEdge: {
        node: {
          title: this.props.title
        }
      },
      user: {
        id: this.props.user.id
      }
    };
  }
}

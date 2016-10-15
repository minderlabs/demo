//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

/**
 * Creates new item.
 * https://facebook.github.io/relay/docs/guides-mutations.html
 */
export default class CreateItemMutation extends Relay.Mutation {

  // TODO(burdon): Add other properties other than title?

  static fragments = {
    user: () => Relay.QL`
      fragment on User {
        id
      }
    `
  };

  getMutation() {
    // Corresponds to schema mutation type.
    return Relay.QL`mutation { createItemMutation }`;
  }

  /**
   * Extract variables from the arguments provided to the mutation constructor.
   * These fields should match the inputFields in the mutation type (in the schema).
   */
  getVariables() {
    return {
      userId: this.props.user.id,
      title: this.props.title,
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
        },

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

  // TODO(burdon): Entire user object is returned because it contains the items?
  getOptimisticResponse() {
    return {
      user: {
        id: this.props.user.id
      },

      // TODO(burdon): Create edges for other properties?
      createItemEdge: {
        node: {
          title: this.props.title
        }
      }
    };
  }
}

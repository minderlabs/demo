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

  // TODO(burdon): Generalize fields.

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
      labels: this.props.labels
    };
  }

  getFatQuery() {
    return Relay.QL`
      fragment on CreateItemMutationPayload @relay(pattern: true) {
        user {
          items {
            edges {
              node {
                id
                title
                labels
              }
            }
          }
        },

        itemEdge
      }
    `;
  }

  getConfigs() {
    // TODO(burdon): Multiple parents and edges?
    // https://facebook.github.io/relay/docs/guides-mutations.html#range-add
    return [{
      type: 'RANGE_ADD',
      parentName: 'user',
      parentID: this.props.user.id,
      connectionName: 'items',
      edgeName: 'itemEdge',
      rangeBehaviors: {
        '': 'append',
        'orderby(oldest)': 'prepend'
      }
    }];
  }

  getOptimisticResponse() {
    return {
      user: {
        id: this.props.user.id
      },

      itemEdge: {
        node: {
          title: this.props.title,
          labels: this.props.labels
        }
      }
    };
  }
}

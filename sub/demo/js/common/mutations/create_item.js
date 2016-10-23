//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

/**
 * Creates new task.
 * https://facebook.github.io/relay/docs/guides-mutations.html
 */
export default class CreateItemMutation extends Relay.Mutation {

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

  // TODO(burdon): userId becomes bucket Id? (server already knows which user we are).

  /**
   * Extract variables from the arguments provided to the mutation constructor.
   * These fields should match the inputFields in the mutation type (in the schema).
   */
  getVariables() {
    return {
      userId: this.props.user.id,
      type:   this.props.type,

      title:  this.props.title,
      labels: this.props.labels

      // TODO(burdon): Data
    };
  }

  getFatQuery() {
    // TODO(burdon): Document @relay
    return Relay.QL`
      fragment on CreateItemMutationPayload @relay(pattern: true) {
        user {
          items {
            edges {
              node {
                id
                type
                title
                labels
              }
            }
          }
        }

        itemEdge
      }
    `;
  }

  getConfigs() {
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
          type: this.props.type,
          title: this.props.title,
          labels: this.props.labels
        }
      }
    };
  }
}

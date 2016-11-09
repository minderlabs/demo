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
    viewer: () => Relay.QL`
      fragment on Viewer {
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
      userId: this.props.viewer.id,

      type:   this.props.type,
      title:  this.props.title,
      labels: this.props.labels,
      data:   this.props.data
    };
  }

  // TODO(burdon): Get newly created Item (e.g., for ID).
  // https://github.com/facebook/relay/issues/166

  getFatQuery() {
    // TODO(burdon): Document @relay annotation.
    return Relay.QL`
      fragment on CreateItemMutationPayload @relay(pattern: true) {
        viewer {
          items {
            edges {
              node {
                id
                type

                title
                labels
                data
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
      parentName: 'viewer',
      parentID: this.props.viewer.id,
      connectionName: 'items',
      edgeName: 'itemEdge',
      rangeBehaviors: () => { return 'ignore'; }
    }];
  }
}

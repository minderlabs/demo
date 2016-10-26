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

  // TODO(burdon): userId becomes bucket Id? (server already knows which user we are).

  /**
   * Extract variables from the arguments provided to the mutation constructor.
   * These fields should match the inputFields in the mutation type (in the schema).
   */
  getVariables() {
    return {
      userId: this.props.viewer.id,
      type: this.props.type,

      title: this.props.title,
      labels: this.props.labels

      // TODO(burdon): Data
    };
  }

  // TODO(madadam): To update the current search results after a mutation, does the current query need
  // to be passed in here as a variable? Passing an empty string to searchItems() seems to work, but this
  // is probably over-fetching.

  getFatQuery() {
    // TODO(burdon): Document @relay
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
              }
            }
          }

          searchItems(text: "")
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
      rangeBehaviors: {
        '': 'append',
        'orderby(oldest)': 'prepend'
      }
    }];
  }

  getOptimisticResponse() {
    return {
      viewer: {
        id: this.props.viewer.id
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

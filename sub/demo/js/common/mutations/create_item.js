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

  //
  // TODO(burdon): ISSUE: The trouble with a single master Items edge is that it defeats caching.
  // If we have multiple mutations, the entire "set" must be invalidated each time.
  //

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
      labels: this.props.labels,

      data: this.props.data
    };
  }

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

  // TODO(burdon): Error since rangeBehaviors can't match filter arg.
  // Warning: Using `null` as a rangeBehavior value is deprecated. Use `ignore` to avoid refetching a range.
  // https://github.com/facebook/relay/issues/293
  // https://github.com/facebook/relay/issues/538

  getConfigs() {
    // https://facebook.github.io/relay/docs/guides-mutations.html#range-add
    return [{
      type: 'RANGE_ADD',
      parentName: 'viewer',
      parentID: this.props.viewer.id,
      connectionName: 'items',
      edgeName: 'itemEdge',
      rangeBehaviors: {
        '': 'append',   // Append if no args.
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
          labels: this.props.labels,
          data: this.props.data
        }
      }
    };
  }
}

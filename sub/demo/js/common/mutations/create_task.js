//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

/**
 * Creates new task.
 * https://facebook.github.io/relay/docs/guides-mutations.html
 */
export default class CreateTaskMutation extends Relay.Mutation {

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
    return Relay.QL`mutation { createTaskMutation }`;
  }

  /**
   * Extract variables from the arguments provided to the mutation constructor.
   * These fields should match the inputFields in the mutation type (in the schema).
   */
  getVariables() {
    return {
      userId: this.props.user.id,
      title: this.props.title,
      status: this.props.status
    };
  }

  getFatQuery() {
    return Relay.QL`
      fragment on CreateTaskMutationPayload @relay(pattern: true) {
        user {
          tasks {
            edges {
              node {
                id,
                title,
                status
              }
            }
          }
        },

        taskEdge
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
      connectionName: 'tasks',
      edgeName: 'taskEdge',
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

      taskEdge: {
        node: {
          title: this.props.title
        }
      }
    };
  }
}

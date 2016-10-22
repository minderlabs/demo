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
    };
  }

  getFatQuery() {
    return Relay.QL`
      fragment on CreateItemMutationPayload {
        item
      }
    `;
  }

  getConfigs() {
    // https://facebook.github.io/relay/docs/guides-mutations.html#fields-change
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        item: this.props.item.id
      }
    }];
  }

  getOptimisticResponse() {
    return {
      user: {
        id: this.props.user.id
      },

      item: {
        type:   this.props.type,
        title:  this.props.title,
        labels: this.props.labels
      }
    };
  }
}

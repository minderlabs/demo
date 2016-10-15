//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

/**
 * Updates an existing item.
 */
export default class UpdateItemMutation extends Relay.Mutation {

  static fragments = {
    item: () => Relay.QL`
      fragment on Item {
        id
      }
    `
  };

  getMutation() {
    // Corresponds to schema mutation type.
    return Relay.QL`mutation { updateItemMutation }`;
  }

  getVariables() {

    console.log('GV !!!!!!!!!!!!', this.props);

    return {
      userId: this.props.user.id,
      itemId: this.props.item.id,
      title:  this.props.title,
      status: this.props.status
    };
  }

  // TODO(burdon): Generalize what can be updated?
  getFatQuery() {
    return Relay.QL`
      fragment on UpdateItemMutationPayload {
        item {
          title,
          status
        }
      }
    `;
  }

  // https://facebook.github.io/relay/docs/guides-mutations.html#fields-change
  getConfigs() {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        item: this.props.item.id
      }
    }];
  }

  getOptimisticResponse() {
    return {
      item: {
        id: this.props.item.id,
        status: this.props.status
      }
    };
  }
}

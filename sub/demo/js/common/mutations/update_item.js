//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

import { Util } from '../util/util';

/**
 * Updates an existing item.
 */
export default class UpdateItemMutation extends Relay.Mutation {

  // TODO(burdon): Generalize fields.
  // TODO(burdon): How to add/remove from array (e.g., labels).

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
    return {
      userId: this.props.user.id,
      itemId: this.props.item.id,

      title:  this.props.title,
      labels: this.props.labels
    };
  }

  getFatQuery() {
    return Relay.QL`
      fragment on UpdateItemMutationPayload {
        item {
          title
          labels
        }
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
    let item = {
      id: this.props.item.id,
    };

    Util.maybeUpdateItem(item, this.props, 'title');
    Util.updateStringSet(item, this.props, 'labels');

    return {
      item: item
    };
  }
}

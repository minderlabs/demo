//
// Copyright 2016 Minder Labs.
//

'use strict';

import Relay from 'react-relay';

import { Util } from '../../util/util';

/**
 * Updates an existing item.
 * https://facebook.github.io/relay/docs/guides-mutations.html
 */
export default class UpdateItemMutation extends Relay.Mutation {

  static fragments = {
    viewer: () => Relay.QL`
      fragment on Viewer {
        id
      }
    `,

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
      userId: this.props.viewer.id,
      itemId: this.props.item.id,

      title:  this.props.title,
      labels: this.props.labels,
      data:   this.props.data
    };
  }

  getFatQuery() {
    // TODO(burdon): Invalidate viewer.items.
    return Relay.QL`
      fragment on UpdateItemMutationPayload {
        item {
          title
          labels
          data
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

    // TODO(burdon): Update data.

    return {
      viewer: {
        id: this.props.viewer.id
      },

      item: item
    };
  }
}

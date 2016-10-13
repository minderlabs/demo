//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import UpdateItemMutation from '../../mutation/update_item';

/**
 * Generic data item.
 */
class Item extends React.Component {

  handleToggleStatus(ev) {
    let { item } = this.props;

    this.props.relay.commitUpdate(
      new UpdateItemMutation({
        item: item,                         // TODO(burdon): Just pass in ID?
        status: item.status ? 0 : 1
      })
    );
  }

  render() {
    let { item } = this.props;

    // TODO(burdon): If renderer is item_list specific then move to inner class.

    return (
      <div className="app-list-item">
        <i className="app-icon app-icon-medium app-icon-star material-icons"
           onClick={ this.handleToggleStatus.bind(this) }>
          { item.status ? 'star': 'star_border' }
        </i>
        <div className="app-expand" title={ item.id }>{ item.title }</div>
        {/*
        <i className="app-icon app-icon-medium app-icon-edit material-icons">mode_edit</i>
        */}
      </div>
    );
  }
}

export default Relay.createContainer(Item, {

  // TODO(burdon): Document fragments (and entire dependency chain of this madness).
  // http://stackoverflow.com/questions/33769922/relay-mutation-expects-data-fetched-by-relay

  fragments: {
    item: () => Relay.QL`
      fragment on Item {
        id,
        version,
        status,
        title,

        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});

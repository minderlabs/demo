//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import UpdateItemMutation from '../../mutations/update_item';

/**
 * Generic data item.
 */
class Item extends React.Component {

  static propTypes = {
    item: React.PropTypes.object.isRequired
  };

  handleToggleStatus(ev) {
    ev.stopPropagation();

    let { user, item } = this.props;

    // TODO(burdon): This should add/remove a label.
    this.props.relay.commitUpdate(
      new UpdateItemMutation({
        user: user,                         // TODO(burdon): Just pass in ID?
        item: item,                         // TODO(burdon): Just pass in ID?
        status: item.status ? 0 : 1         // TODO(burdon): Label.
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

        <div className="app-expand app-field-title" title={ item.id }>{ item.title }</div>
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
        title,
        status,

        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});

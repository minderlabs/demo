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

  handleToggleStatus(event) {
    event.stopPropagation();

    let { user, item } = this.props;

    this.props.relay.commitUpdate(
      new UpdateItemMutation({
        user: user,                                 // TODO(burdon): Just pass in ID?
        item: item,                                 // TODO(burdon): Just pass in ID?
        labels: [{
          index: _.indexOf(item['labels'], 'favorite') == -1 ? 0 : -1,
          value: 'favorite'
        }],
        status: item.status ? 0 : 1                 // TODO(burdon): Remove.
      })
    );
  }

  render() {
    let { item } = this.props;

    return (
      <div>
        <i className="app-icon app-icon-medium app-icon-star material-icons"
           onClick={ this.handleToggleStatus.bind(this) }>
          { _.indexOf(item['labels'], 'favorite') != -1 ? 'star': 'star_border' }
        </i>

        <div className="app-expand app-field-title" title={ item.id }>{ item.title }</div>
      </div>
    );
  }
}

export default Relay.createContainer(Item, {

  fragments: {
    item: () => Relay.QL`
      fragment on Item {
        id
        title
        labels
        status

        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});

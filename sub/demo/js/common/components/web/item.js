//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import UpdateItemMutation from '../../mutations/update_item';

import TypeRegistry from './type_registry';

import './item.less';

/**
 * Compact view of an Item.
 */
class Item extends React.Component {

  static propTypes = {
    item: React.PropTypes.object.isRequired
  };

  handleToggleFavorite(event) {
    event.stopPropagation();

    let { user, item } = this.props;

    this.props.relay.commitUpdate(
      new UpdateItemMutation({
        user: user,                                 // TODO(burdon): Just pass in ID?
        item: item,                                 // TODO(burdon): Just pass in ID?
        labels: [{
          index: _.indexOf(item['labels'], '_favorite') == -1 ? 0 : -1,
          value: '_favorite'
        }]
      })
    );
  }

  render() {
    let { item } = this.props;

    let icon = TypeRegistry.icon(item.type);

    return (
      <div>
        <i className="app-icon app-icon-medium app-icon-star material-icons"
           onClick={ this.handleToggleFavorite.bind(this) }>
          { _.indexOf(item['labels'], '_favorite') != -1 ? 'star': 'star_border' }
        </i>

        <div className="app-expand">
          <div className="app-field-title">{ item.title }</div>
          <div className="app-debug">{ item.snippet }</div>
        </div>

        <i className="app-icon app-icon-medium app-icon-type material-icons">{ icon }</i>
      </div>
    );
  }
}

export default Relay.createContainer(Item, {

  initialVariables: {
    query: ''
  },

  fragments: {
    item: () => Relay.QL`
      fragment on Item {
        id
        type
        title
        labels
        snippet(text: $query)

        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});

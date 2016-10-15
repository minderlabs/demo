//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Item from './item';

import './list.less';

/**
 * List.
 */
class ItemList extends React.Component {

  // TODO(burdon): Replace with selection model.
  handleSelect(node) {
    this.props.onSelect && this.props.onSelect(node);
  }

  render() {
    let { user } = this.props;

    let items = user.items.edges.map(edge =>
      <div key={ edge.node.id } onClick={ this.handleSelect.bind(this, edge.node) }>
        <Item user={ user } item={ edge.node }/>
      </div>
    );

    return (
      <div className="app-section app-expand app-list">{ items }</div>
    );
  }
}

export default Relay.createContainer(ItemList, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,
        items(first: 10) {
          edges {
            node {
              id,

              ${Item.getFragment('item')}
            }
          }
        }
      }
    `
  }
});

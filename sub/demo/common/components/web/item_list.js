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
  getItems() {
    // TODO(trey): allow filtering
    return this.props.items.edges;
  }
  
  makeItem = (edge) => {
    return (
      <li><Item key={edge.node.id}
            item={edge.node}
            viewer={this.props.viewer} /></li>
    );
  }

  render() {
    const items = this.getItems();
    const itemList = items.map(this.makeItem);
    return (
      <div className="app-section app-expand app-list">
        <ul>
          {itemList}
        </ul>
      </div>
    );
  }
}

// TODO(burdon): Factor out ListView and data binding?
export default Relay.createContainer(ItemList, {
  fragments: {
    items: () => Relay.QL`
      fragment on _ItemConnection {
        count,
        edges {
          node {
            id,
            ${Item.getFragment('item')}
          }
        }
      }
    `
  }
});

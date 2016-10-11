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

  render() {
    const { user } = this.props;

//  user.items.edges.map(edge => console.log(edge.node));

    return (
      <div className="app-section app-expand app-list">
        {user.items.edges.map(edge =>
          <Item key={edge.node.id} item={edge.node}/>
        )}
      </div>
    );
  }
}

// TODO(burdon): Factor out ListView and data binding?
export default Relay.createContainer(ItemList, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
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

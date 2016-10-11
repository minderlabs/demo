//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Item from './item';

class ItemList extends React.Component {

  render() {
    const {user} = this.props;
    return (
      <div className="app-section app-expand">
        <ul>
          {user.items.edges.map(({node}) =>
            <li><Item item={node} /></li>
          )}
        </ul>
      </div>
    );
  }
}

export default Relay.createContainer(ItemList, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        items(first: 10) {
          edges {
            node {
              ${Item.getFragment('item')}
            }
          }
        }
      }
    `
  }
});


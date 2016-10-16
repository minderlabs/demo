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

  handleSelect(node) {
    // TODO(burdon): Replace with selection model.
    this.props.onSelect && this.props.onSelect(node);
  }

  render() {
    let { user } = this.props;

    // TODO(burdon): If renderer is item_list specific then move to inner class.
    let items = user.items.edges.map(edge =>
      <div key={ edge.node.id } className="app-list-item" onClick={ this.handleSelect.bind(this, edge.node) }>
        <Item user={ user } item={ edge.node }/>
      </div>
    );

    return (
      <div className="app-section app-expand app-list">{ items }</div>
    );
  }
}

// TODO(burdon): Document fragments (and entire dependency chain).
// TODO(burdon): How are parameters passed into fragment queries?
// https://facebook.github.io/relay/docs/guides-containers.html#composing-fragments
// http://stackoverflow.com/questions/33769922/relay-mutation-expects-data-fetched-by-relay

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

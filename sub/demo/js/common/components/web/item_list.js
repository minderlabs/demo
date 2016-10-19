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

  setQuery(text) {
    // https://facebook.github.io/relay/docs/api-reference-relay-container.html#setvariables
    this.props.relay.setVariables({
      query: text
    });
  }

  render() {
    let { user } = this.props;

    // TODO(burdon): If renderer is item_list specific then move to inner class.
    let items = user.items.edges.map(edge =>
      <div key={ edge.node.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, edge.node) }>
        <Item user={ user } item={ edge.node }/>
      </div>
    );

    let searchItems = user.searchItems.map(node => {
      return (
        <div key={ node.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, node) }>
          <Item user={ user } item={ node }/>
        </div>
      );
    });

    return (
      <div>
        <h3>Items</h3>
        <div className="app-section app-expand app-list">{ items }</div>

        <h3>Search</h3>
        <div className="app-section app-expand app-list">{ searchItems }</div>
      </div>
    );
  }
}

export default Relay.createContainer(ItemList, {

  initialVariables: {
    query: ''
  },

  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,

        searchItems(text: $query) {
          ${Item.getFragment('item')}
        },

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

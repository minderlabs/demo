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

    let itemResults = user.searchItems.map(item =>
      <div key={ item.id } className="app-list-item" onClick={ this.handleSelect.bind(this, item) }>
        <Item user={ user } item={ item }/>
      </div>
    );

    return (
      <div>
        <div className="app-section app-expand app-list">{ items }</div>
        <div>Search Results:</div>
        <div className="app-section app-expand app-list">{ itemResults }</div>
      </div>
    );
  }
}

// TODO(burdon): Document fragments (and entire dependency chain).
// TODO(burdon): How are parameters passed into fragment queries?
// https://facebook.github.io/relay/docs/guides-containers.html#composing-fragments
// http://stackoverflow.com/questions/33769922/relay-mutation-expects-data-fetched-by-relay

export default Relay.createContainer(ItemList, {
  initialVariables: {
    queryString: '1'
  },

  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,

        searchItems(text: $queryString) {
          snippet(text:$queryString),
          ... on Note {
            title,
            content
          },
          ... on Item {
            ${Item.getFragment('item')}
          }
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

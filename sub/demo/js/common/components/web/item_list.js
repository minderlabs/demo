//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Item from './item';
import Note from './type/note';

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

    let items = user.items.edges.map(edge =>
      <div key={ edge.node.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, edge.node) }>
        <Item user={ user } item={ edge.node }/>
      </div>
    );

    let searchItems = null;
    /*
    let searchItems = user.searchItems.map(item => {
      // TODO(burdon): Generic Item renderer with TypeRegistry inside.
      return (
        <div key={ item.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, item) }>
          {(() => {
            switch (item.type) {
              case 'item':
                return <Item user={ user } item={ item }/>;

              case 'note':
                return <Note user={ user } note={ item }/>;
            }
          })()}
        </div>
      );
    });
    */

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
        id

        searchItems(text: $query) {
          type

          ... on Item {
            ${Item.getFragment('item')}
          }
        }

        items(first: 10) {
          edges {
            node {
              id

              ${Item.getFragment('item')}
            }
          }
        }
      }
    `
  }
});

// TODO(burdon): Error (in searchItems).
// Fragment "F1" cannot be spread here as objects of type "Item" can never be of type "Note".
// https://github.com/facebook/relay/issues/782
// ... on Note {
//   ${Note.getFragment('note')}
// }

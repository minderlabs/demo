//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Item from './item';

import './item_list.less';

/**
 * List.
 */
class ItemList extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

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
    let { viewer } = this.props;

    let searchItems = viewer.searchItems.map(item => {
      return (
        <div key={ item.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, item) }>
          <Item item={ item } query={ this.props.relay.variables.query } />
        </div>
      );
    });

    return (
      <div>
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
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        searchItems(text: $query) {
          id
          type

          ${Item.getFragment('item', { query: variables.query })}
        }
      }
    `
  }
});

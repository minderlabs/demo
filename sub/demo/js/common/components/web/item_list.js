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
      text: text
    });
  }

  render() {
    let { viewer } = this.props;

    let searchItems = viewer.searchItems.map(item => {
      return (
        <div key={ item.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, item) }>
          <Item item={ item } text={ this.props.relay.variables.text } />
        </div>
      );
    });

    return (
      <div>
        <div className="app-list app-expand">{ searchItems }</div>
      </div>
    );
  }
}

export default Relay.createContainer(ItemList, {

  // TODO(burdon): Search by filter.

  initialVariables: {
    text: ''
  },

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        searchItems(text: $text) {
          id
          type

          ${Item.getFragment('item', { text: variables.text })}
        }
      }
    `
  }
});

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
    viewer: React.PropTypes.object.isRequired,
    filter: React.PropTypes.object.isRequired
  };

  handleSelect(node) {
    // TODO(burdon): Replace with selection model.
    this.props.onSelect && this.props.onSelect(node);
  }

  render() {
    let { viewer } = this.props;

    let items = viewer.items.edges.map(edge => {
      return (
        <div key={ edge.node.id }
             className="app-list-item"
             onClick={ this.handleSelect.bind(this, edge.node) }>

          <Item viewer={ viewer }
                item={ edge.node }
                filter={ this.props.relay.variables.filter } />
        </div>
      );
    });

    return (
      <div>
        <div className="app-list app-expand">{ items }</div>
      </div>
    );
  }
}

export default Relay.createContainer(ItemList, {

  initialVariables: {
    filter: {}
  },

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id 

        items(first: 10, filter: $filter) {
          edges {
            node {
              id
              title

              ${Item.getFragment('item', { filter: variables.filter })}
            }
          }
        }

        ${Item.getFragment('viewer', { filter: variables.filter })}
      }
    `
  }
});

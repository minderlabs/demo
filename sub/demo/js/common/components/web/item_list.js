//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Task from './task';
import Note from './note';

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
    let tasks = user.tasks.edges.map(edge =>
      <div key={ edge.node.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, edge.node) }>
        <Task user={ user } task={ edge.node }/>
      </div>
    );

    let searchItems = user.searchItems.map(item => {
      return (
        <div key={ item.__dataID__ } className="app-list-item" onClick={ this.handleSelect.bind(this, item) }>
          {(() => {
            switch (item.type) {
              case 'item':
                return <Task user={ user } task={ item }/>;
              case 'note':
                return <Note user={ user } note={ item }/>;
            }
          })()}
        </div>
      );
    });

    return (
      <div>
        <h3>Tasks</h3>
        <div className="app-section app-expand app-list">{ tasks }</div>

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
          type,
          ... on Note {
            ${Note.getFragment('note')}
          },
          ... on Task {
            ${Task.getFragment('task')}
          }
        },

        tasks(first: 10) {
          edges {
            node {
              id,

              ${Task.getFragment('task')}
            }
          }
        }
      }
    `
  }
});

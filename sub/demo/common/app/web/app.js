//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

//import './demo.less';

/**
 * App container.
 */
export class App extends React.Component {

  renderItems() {
    return this.props.user.items.edges.map(edge =>
      <li key="{edge.node.id}">{edge.node.title} (ID: {edge.node.id})</li>
    );
  }

  render() {
    return (
      <div className="app-panel app-panel-column">
        <h1>{ this.props.title }</h1>

        <div className="app-section app-expand">
          <ul>
            {this.renderItems()}
          </ul>
        </div>
    );
  }
}

export default Relay.createContainer(App, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        items(first: 10) {
          edges {
            node {
              id,
              title
            }
          }
        }
      }
    `
  }
});


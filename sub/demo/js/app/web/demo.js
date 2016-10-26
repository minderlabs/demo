//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import './demo.less';

/**
 * Root app component.
 */
class DemoApp extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  render() {
    let { viewer, children } = this.props;

    return (
      <div className="app-panel">
        <div className="app-header">
          <h1>{ viewer.title }</h1>

          <div>
            <a href="/graphql" target="_blank">GraphiQL</a>
            <a href="/logout">Logout</a>
          </div>
        </div>

        <div className="app-section">
          <div className="app-debug">{ JSON.stringify(viewer, 0, 2) }</div>
        </div>

        <div className="app-view app-panel-column">
          { children }
        </div>
      </div>
    );
  }
}

//
// Root container
// https://facebook.github.io/relay/docs/api-reference-relay-container.html
//

export default Relay.createContainer(DemoApp, {

  fragments: {
    viewer: () => Relay.QL`
      fragment on Viewer {
        id
        title
      }
    `
  }
});

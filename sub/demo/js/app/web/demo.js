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

  render() {
    let { children, user } = this.props;

    return (
      <div className="app-panel">
        <div className="app-header">
          <h1>{ user.title }</h1>
          <a href="/graphql" target="_blank">GraphiQL</a>
        </div>

        <div className="app-section">
          <div className="app-debug">{ JSON.stringify(user) }</div>
        </div>

        <div className="app-view app-panel-column">
          { children }
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(DemoApp, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,
        title
      }
    `
  }
});

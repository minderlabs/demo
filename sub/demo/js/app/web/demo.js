//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import { Link } from 'react-router';

// NOTE: Don't remove (needed to trigger webpack on schema changes).
import { VERSION } from '../../common/data/schema';

import Path from './path';

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
          <div>
            <Link to={ Path.HOME }>
              <i className="material-icons">menu</i>
            </Link>

            <h1>Demo</h1>
          </div>

          <div className="app-links">
            <span>{ viewer.user.title }</span>
            <a href="/graphql" target="_blank">GraphiQL</a>
            <Link to={ Path.DEBUG }>Debug</Link>
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
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        user {
          title
        }
      }
    `
  }
});

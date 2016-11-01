//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import { Link } from 'react-router';

import Sidebar from '../../common/components/web/sidebar';

import Path from './path';

import './app.less';

/**
 * Root app component.
 */
class DemoApp extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  handleNav(path, event) {
    this.refs.sidebar.close();

    // TODO(burdon): Root query for folder.
    this.context.router.push(path);
  }

  render() {
    let { viewer, children } = this.props;

    // TODO(burdon): Move header to base class for view.

    // TODO(burdon): Factor out panel.
    const sidebar = (
      <div>
        <div className="app-list">
          <a className="app-list-item" onClick={ this.handleNav.bind(this, Path.HOME) }>Inbox</a>
          <a className="app-list-item" onClick={ this.handleNav.bind(this, Path.ROOT + 'favorites') }>Favorites</a>
          <a className="app-list-item" onClick={ this.handleNav.bind(this, Path.DEBUG) }>Debug</a>
        </div>
      </div>
    );

    const handleToggleSidebar = (event) => {
      event.preventDefault(); // Don't steal focus.
      this.refs.sidebar.toggle();
    };

    return (
      <div className="app-column">
        <div className="app-header">
          <div>
            <i className="material-icons" onMouseDown={ handleToggleSidebar }>menu</i>
            <h1>Demo</h1>
          </div>

          <div className="app-links">
            <span>{ viewer.user.title }</span>
            <a href="/graphql" target="_blank">GraphiQL</a>
            <a href="/logout">Logout</a>
          </div>
        </div>

        <Sidebar ref="sidebar" sidebar={ sidebar }>
          <div className="app-view app-column app-expand">
            { children }
          </div>
        </Sidebar>

        <div className="app-footer"></div>
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

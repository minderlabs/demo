//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Sidebar from '../../common/components/web/sidebar';

import { Const } from './defs';
import Path from './path';

import './layout.less';


/**
 * Root component.
 */
class Layout extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired,
    errorHandler: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      error: null
    };

    this.context.errorHandler.listen('Layout', (error) => {
      this.setState({
        error: error
      })
    });
  }

  handleNav(path, event) {
    this.refs.sidebar.close();

    // TODO(burdon): Root query for folder.
    this.context.router.push(path);
  }

  handleDebug() {
    window.open('/graphql', 'GRAPHQL');
  }

  handleStatusReset() {
    this.setState({
      error: null
    })
  }

  render() {
    let { viewer, children } = this.props;

    let statusProps = this.state.error ? {
      title: this.state.error.message,
      className: 'app-icon-error',
      icon: 'close'
    } : {
      title: 'OK',
      className: 'app-icon-ok',
      icon: 'check'
    };

    const handleToggleSidebar = (event) => {
      event.preventDefault(); // Don't steal focus.
      this.refs.sidebar.toggle();
    };

    // TODO(burdon): Factor out sidepanel list.
    const sidebar = (
      <div>
        <div className="app-list">
          <a className="app-list-item" onClick={ this.handleNav.bind(this, Path.HOME) }>Inbox</a>
          <a className="app-list-item" onClick={ this.handleNav.bind(this, Path.ROOT + 'favorites') }>Favorites</a>
          <a className="app-list-item" onClick={ this.handleNav.bind(this, Path.DEBUG) }>Debug</a>
        </div>
      </div>
    );

    return (
      <div className="app-column">
        <div className="app-header">
          <div>
            <i className="material-icons" onMouseDown={ handleToggleSidebar }>menu</i>
            <h1>{ Const.app.title }</h1>
          </div>

          <div className="app-links">
            <span>{ viewer.user.title }</span>
            <a href="/logout">Logout</a>
          </div>
        </div>

        <Sidebar ref="sidebar" sidebar={ sidebar }>
          <div className="app-view app-column app-expand">
            { children }
          </div>
        </Sidebar>

        <div className="app-footer">
          <i className="material-icons app-icon-debug"
             title="GraphiQL"
             onClick={ this.handleDebug.bind(this) }>bug_report</i>
          <div className="app-expand"></div>
          <i className={ 'material-icons ' + statusProps.className }
             title={ statusProps.title }
             onClick={ this.handleStatusReset.bind(this) }>{ statusProps.icon }</i>
        </div>
      </div>
    );
  }
}

//
// Root container
// https://facebook.github.io/relay/docs/api-reference-relay-container.html
//

export default Relay.createContainer(Layout, {

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

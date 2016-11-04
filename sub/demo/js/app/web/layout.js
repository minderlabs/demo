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

  static contextTypes = {
    router: React.PropTypes.object,
    eventHandler: React.PropTypes.object,
    subscriptionManager: React.PropTypes.object
  };

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      network: false,
      error: null
    };

    this._netIconTimer = null;

    this.context.eventHandler.listen('Layout', (event) => {
      switch (event.type) {

        // Global JS errors.
        case 'error': {
          this.setState({
            error: event.message
          });
          break;
        }

        // Network event.
        case 'net': {
          this.setState({
            network: true
          });

          this._netIconTimer && clearTimeout(this._netIconTimer);
          this._netIconTimer = setTimeout(() => {
            this._netIconTimer = null;
            this.setState({
              network: false
            });
          }, 500);
          break;
        }
      }
    });
  }

  handleNav(path, event) {
    this.refs.sidebar.close();

    // TODO(burdon): Root query for folder.
    this.context.router.push(path);
  }

  handleLink(url) {
    window.open(url, 'DEMO');
  }

  handleRefresh() {
    this.context.subscriptionManager.invalidate();
  }

  handleStatusReset() {
    this.setState({
      error: null
    })
  }

  render() {
    let { viewer, children } = this.props;

    const statusProps = this.state.error ? {
      title: this.state.error.message,
      className: 'app-icon-error',
      icon: 'highlight_off'
    } : {
      title: 'OK',
      className: 'app-icon-ok',
      icon: 'check'
    };

    const netProps = this.state.network ? {} : {
      className: 'app-hidden'
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
          <i className="material-icons app-icon-press" title="Clients"
             onClick={ this.handleLink.bind(this, '/clients') }>dns</i>
          <i className="material-icons app-icon-press" title="GraphiQL"
             onClick={ this.handleLink.bind(this, '/graphql') }>bug_report</i>
          <i className="material-icons app-icon-press" title="Refresh data"
             onClick={ this.handleRefresh.bind(this) }>refresh</i>

          <div className="app-expand"></div>

          <i className={ 'material-icons app-icon-network ' + netProps.className }>wifi</i>
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

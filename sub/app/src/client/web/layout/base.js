//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { DomUtil, EventHandler, PropertyProvider, QueryRegistry } from 'minder-core';
import { Sidebar, SidebarToggle } from 'minder-ux';

import { AppAction } from '../reducers';
import { Navigator, WindowNavigator } from '../path'
import { Const } from '../../../common/defs';

import { NavBar } from '../component/navbar';
import { SidePanel } from '../component/sidepanel';
import { StatusBar } from '../component/statusbar';

import './base.less';

/**
 * Layout for all containers.
 */
export class BaseLayout extends React.Component {

  static contextTypes = {
    injector: React.PropTypes.object.isRequired
  };

  static childContextTypes = {
    navigator: React.PropTypes.object,
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {
    // Provided by redux.
    navigator: React.PropTypes.object.isRequired,
    queryRegistry: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    // TODO(burdon): Need to display error state on startup (status not yet rendered).
    this.context.injector.get(EventHandler)
      .listen('error',        event => { this.refs.status && this.refs.status.error(event.message); })
      .listen('network.in',   event => { this.refs.status && this.refs.status.networkIn();          })
      .listen('network.out',  event => { this.refs.status && this.refs.status.networkOut();         });
  }

  getChildContext() {
    let { config, navigator, queryRegistry, serverProvider } = this.props;

    // CRX opens window on nav.
    let platform = _.get(config, 'app.platform');
    if (platform === 'crx') {
      navigator = new WindowNavigator(serverProvider);
    }

    return {
      navigator,
      queryRegistry
    };
  }

  handleToolbarClick(id) {
    switch (id) {
      case 'bug': {
        console.warn('Debug Info...');
        break;
      }

      case 'refresh': {
        this.props.queryRegistry.invalidate();
        break;
      }
    }
  }

  render() {
    let { children, className, config, team, viewer, folders } = this.props;

    let sidePanel = <SidePanel team={ team } folders={ folders }/>;

    return (
      <div className="ux-fullscreen">
        <div className={ DomUtil.className('ux-main-layout', 'app-base-layout', className) }>

          {/* Header */}
          <div className="ux-header ux-row">
            <div className="ux-row ux-expand">
              <SidebarToggle sidebar={ () => this.refs.sidebar }/>
              <h1>{ Const.APP_NAME }</h1>
            </div>
            <div>
              <ul className="ux-inline">
                <li>{ viewer && viewer.user.title }</li>
                <li><a href="/user/logout">Logout</a></li>
              </ul>
            </div>
          </div>

          {/* Nav bar */}
          <NavBar/>

          {/* Sidebar */}
          <Sidebar ref="sidebar" sidebar={ sidePanel }>

            {/* Content view. */}
            <div className="ux-column">
              { children }
            </div>
          </Sidebar>

          {/* Footer */}
          <div className="app-footer">
            <StatusBar ref="status" config={ config } onClick={ this.handleToolbarClick.bind(this) }/>
          </div>

          {/* Debug sidebar */}
          {/*
          <div className="ux-debug">
            <Monitor/>
          </div>
          */}
        </div>
      </div>
    );
  }
}

//
// Queries
//

// The App container makes a query for metadata associated with each each folder (e.g., a filter) that can be displayed within the <FolderView>.
// But the container queries are called (and rendered) in reverse order (i.e., ListView, FolderView, App).
// 1). I agree with @sedubois that one of the powerful features of GraphQL is fragment composition (I'm also coming from Relay, where this is trivially supported)>
// 2). The additional benefit is enabling child containers to be "well-formed" i.e., only rendered once their data requirements are satisfied (i.e., passed in as props); also, the child's rendering function doesn't have to handle "null" data (making the code simpler and more robust).
// 3). Furthermore, the react-relay-router can block until these queries are satisfied, so that on error a different router path can be displayed. This also prevents render "flickering" i.e., the child component making a default invalid query, and then re-rendering once the parent's query loads and then reconfigures the child.

const LayoutQuery = gql`
  query LayoutQuery { 

    viewer {
      id
      user {
        title
      }
    }

    folders {
      id
      alias
      title
      icon
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let appState = AppAction.getState(state);
  let { config, injector, user, team } = appState;
  let serverProvider = new PropertyProvider(appState, 'server');
  let queryRegistry = injector.get(QueryRegistry);

  return {
    config,
    serverProvider,
    queryRegistry,
    user,
    team
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    navigator: new Navigator(dispatch)
  };
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  graphql(LayoutQuery, {
    props: ({ ownProps, data }) => {
      let { viewer, folders } = data;

      return {
        viewer, folders
      };
    }
  })

)(BaseLayout);
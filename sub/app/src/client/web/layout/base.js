//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { DomUtil, EventHandler, PropertyProvider, QueryRegistry } from 'minder-core';
import { Sidebar, SidebarToggle } from 'minder-ux';

import { Const } from '../../../common/defs';

import { AppAction } from '../reducers';
import { Navigator, WindowNavigator } from '../path'
import { TypeRegistry } from '../framework/type_registry';
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
    queryRegistry: React.PropTypes.object.isRequired,

    search: React.PropTypes.bool,
    className: React.PropTypes.string
  };

  static defaultProps = {
    search: true
  };

  constructor() {
    super(...arguments);

    // TODO(burdon): Need to display error state on startup (status not yet rendered).
    this.context.injector.get(EventHandler)
      .listen('error',        event => { this.refs.status && this.refs.status.error(event); })
      .listen('network.in',   event => { this.refs.status && this.refs.status.networkIn(); })
      .listen('network.out',  event => { this.refs.status && this.refs.status.networkOut(); });
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
    let { children, search, className, config, typeRegistry } = this.props;
    let { loading, viewer } = this.props; // Data.

    // TODO(burdon): Factor out.
    if (loading) {
      return (
        <div className="ux-loading-bar">
          <div className="ux-load-bar"></div>
          <div className="ux-load-bar"></div>
          <div className="ux-load-bar"></div>
        </div>
      );
    }

    let sidePanel = <SidePanel folders={ viewer.folders }
                               group={ viewer.group }
                               projects={ viewer.group.projects }
                               typeRegistry={ typeRegistry }/>;

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
                <li>{ viewer.group.title }</li>
                <li>{ viewer.user.title }</li>
                <li><a href="/user/logout">Logout</a></li>
              </ul>
            </div>
          </div>

          {/* Nav bar */}
          <NavBar search={ search }/>

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
        </div>
      </div>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const LayoutQuery = gql`
  query LayoutQuery { 

    viewer {
      user {
        type
        id
        title
      }

      group {
        type
        id
        title

        projects {
          type
          id
          type
          title
        }
      }

      folders {
        type
        id
        alias
        title
        icon
      }
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let appState = AppAction.getState(state);
  let { config, injector } = appState;

  // Late binding.
  let serverProvider = new PropertyProvider(appState, 'server');

  let queryRegistry = injector.get(QueryRegistry);
  let typeRegistry = injector.get(TypeRegistry);

  return {
    config,
    serverProvider,
    queryRegistry,
    typeRegistry
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
      return _.pick(data, ['loading', 'error', 'viewer'])
    }
  })

)(BaseLayout);

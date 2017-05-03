//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import PropTypes from 'prop-types';

import { DomUtil, ID, TypeUtil } from 'minder-core';
import { NetUtil, ReactUtil, Sidebar, SidebarToggle } from 'minder-ux';

import { AppAction } from '../../common/reducers';
import { Const } from '../../../common/defs';
import { Path } from '../../common/path';

import SidePanel from '../view/sidepanel';

import { StatusBar } from '../component/statusbar';
import { DebugPanel } from '../component/debug';

import './layout.less';

/**
 * Layout for all containers.
 */
export class LayoutComponent extends React.Component {

  static contextTypes = {
    config: PropTypes.object.isRequired,
    viewer: PropTypes.object.isRequired,
    typeRegistry: PropTypes.object.isRequired,
    queryRegistry: PropTypes.object.isRequired,
    eventHandler: PropTypes.object.isRequired
  };

  static propTypes = {
    navbar: PropTypes.object.isRequired,
    finder: PropTypes.object,
    className: PropTypes.string
  };

  constructor() {
    super(...arguments);

    this.context.eventHandler
      .listen('error',        event => { this.refs.status && this.refs.status.error(event); })
      .listen('network.in',   event => { this.refs.status && this.refs.status.networkIn(); })
      .listen('network.out',  event => { this.refs.status && this.refs.status.networkOut(); });
  }

  // TODO(burdon): Dispatch to ActionHandler (Toolbar introspects to show buttons).
  handleToolbarAction(action) {
    let { config } = this.context;

    switch (action) {

      // Debug info.
      case 'bug': {
        this.props.toggleDebugPanel();
        break;
      }

      // Refresh JWT.
      case 'refresh_id_token': {
        // TODO(burdon): Dispatch to ActionHandler (callback to set config (and timer)). Redux?
        // https://medium.com/javascript-and-opinions/redux-side-effects-and-you-66f2e0842fc3
        // http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559
        if (_.get(config, 'app.platform') === 'CRX') {
          console.warn('Invalid for CRX.');
          break;
        }

        NetUtil.getJson('/user/refresh_id_token', {}, {}, true).then(result => {
          _.assign(config, { credentials: _.get(result, 'credentials') });
          console.log('Updated credentials: ' + TypeUtil.stringify(config.credentials, 2));
        });
        break;
      }

      // Refresh queries.
      case 'invalidate_queries': {
        this.context.queryRegistry.invalidate();
        break;
      }
    }
  }

  render() {
    return ReactUtil.render(this, () => {
      let { config, viewer, typeRegistry } = this.context;
      let { debug, navbar, finder, search, children, className } = this.props;
      let platform = _.get(config, 'app.platform');

      let sidePanel = <SidePanel typeRegistry={ typeRegistry }/>;

      let content;
      let showFinder = finder && (platform !== Const.PLATFORM.WEB || search.text);
      if (showFinder) {
        if (children) {
          content = (
            <div className="app-layout-finder ux-columns">
              { finder }

              <div className="ux-column">
                { children }
              </div>
            </div>
          );
        } else {
          content = finder;
        }
      } else {
        content = children;
      }

      let links = _.compact(_.map(viewer.groups, group => {
        // Don't show private group.
        if (group.bucket !== viewer.user.id) {
          return (
            <li key={ group.id }>
              <Link to={ Path.canvas(ID.toGlobalId('Group', group.id)) }>{ group.title }</Link>
            </li>
          );
        }
      }));

      let debugPanel = debug.showPanel && <DebugPanel/>;

      return (
        <div className="ux-fullscreen">
          <div className={ DomUtil.className('ux-main-layout', 'ux-column', 'app-layout-' + platform, className) }>

            {/* Header */}
            { platform !== Const.PLATFORM.CRX &&
            <div className="ux-header ux-row">
              <div className="ux-row ux-expand">
                <SidebarToggle sidebar={ () => this.refs.sidebar }/>
                <h1>{ Const.APP_NAME }</h1>
              </div>
              <div>
                <ul className="ux-inline">
                  { links }

                  <li>
                    <a target="MINDER_PROFILE" href="/user/profile">{ viewer.user.title }</a>
                  </li>
                  <li>
                    <a href="/user/logout">Logout</a>
                  </li>
                </ul>
              </div>
            </div>
            }

            {/* Navbar */}
            { navbar }

            {/* Main Layout */}
            <div className="ux-columns">

              {/* Sidebar */}
              <Sidebar ref="sidebar">
                { sidePanel }
              </Sidebar>

              {/* Main Content */}
              <div className="app-layout ux-column">
                { content }
              </div>
            </div>

            {/* Debug */}
            <div className="app-debug-panel-container">
              { debugPanel }
            </div>

            {/* Footer */}
            <div className="app-footer">
              <StatusBar ref="status" onAction={ this.handleToolbarAction.bind(this) }/>
            </div>
          </div>
        </div>
      );
    });
  }
}

const mapStateToProps = (state, ownProps) => {
  let { debug, search } = AppAction.getState(state);
  return {
    debug,
    search
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    toggleDebugPanel: () => { dispatch(AppAction.toggleDebugPanel()); }
  }
};

export const Layout = connect(mapStateToProps, mapDispatchToProps)(LayoutComponent);

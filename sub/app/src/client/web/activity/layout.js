//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';

import { DomUtil, ID} from 'minder-core';
import { ReactUtil, Sidebar, SidebarToggle } from 'minder-ux';

import { Const } from '../../../common/defs';
import { Path } from '../../common/path';

import SidePanel from '../view/sidepanel';

import { StatusBar } from '../component/statusbar';

import './layout.less';

/**
 * Layout for all containers.
 */
export class Layout extends React.Component {

  static contextTypes = {
    config: React.PropTypes.object.isRequired,
    viewer: React.PropTypes.object.isRequired,
    typeRegistry: React.PropTypes.object.isRequired,
    queryRegistry: React.PropTypes.object.isRequired,
    eventHandler: React.PropTypes.object.isRequired
  };

  static propTypes = {
    navbar: React.PropTypes.object.isRequired,
    finder: React.PropTypes.object,
    className: React.PropTypes.string
  };

  constructor() {
    super(...arguments);

    this.context.eventHandler
      .listen('error',        event => { this.refs.status && this.refs.status.error(event); })
      .listen('network.in',   event => { this.refs.status && this.refs.status.networkIn(); })
      .listen('network.out',  event => { this.refs.status && this.refs.status.networkOut(); });
  }

  handleToolbarAction(action) {
    let { config } = this.context;

    switch (action) {
      case 'bug': {
        console.warn(JSON.stringify(config, null, 2));
        break;
      }

      case 'refresh': {
        this.context.queryRegistry.invalidate();
        break;
      }
    }
  }

  render() {
    return ReactUtil.render(this, () => {
      let { config, viewer, typeRegistry } = this.context;
      let { navbar, finder, children, className } = this.props;
      let platform = _.get(config, 'app.platform');

      let sidePanel = <SidePanel typeRegistry={ typeRegistry }/>;

      let content;
      if (finder) {
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

            {/* Nav bar */}
            { navbar }

            {/* Sidebar */}
            <Sidebar ref="sidebar" sidebar={ sidePanel }>

              {/* Content view. */}
              <div className="app-layout ux-column">
                { content }
              </div>
            </Sidebar>

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

//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';

import { Async, DomUtil, ErrorUtil } from 'minder-core';

import './statusbar.less';

/**
 * Status bar.
 */
export class StatusBar extends React.Component {

  static contextTypes = {
    config: PropTypes.object.isRequired
  };

  static propTypes = {
    onAction: PropTypes.func.isRequired
  };

  constructor() {
    super(...arguments);

    this._timer = {
      networkIn: Async.delay(750),
      networkOut: Async.delay(500)
    };

    this.state = {
      error: false,
      networkIn: false,
      networkOut: false
    };
  }

  componentWillUnmount() {
    // TODO(burdon): Statusbar should be part of outer component (so isn't rerenderes on nav).
    // Cancel timers to avoid setState on unmounted component.
    // JS Error: Warning: setState(...): Can only update a mounted or mounting component.
    // https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
    this._timer.networkIn();
    this._timer.networkOut();
  }

  error(error) {
    this.setState({
      error
    });
  }

  networkIn() { this.network('networkIn'); }
  networkOut() { this.network('networkOut'); }

  network(type) {
    this.setState({
      [type]: true
    });

    this._timer[[type]](() => {
      this.setState({
        [type]: false
      });
    });
  }

  handleAction(icon) {
    this.props.onAction(icon);
  }

  handleClickError() {
    this.error(false);
  }

  showHelp(showHelp=true) {
    if (showHelp) {
      window.Intercom('show');
    } else {
      window.Intercom('hide');
    }
  }

  render() {
    let { config } = this.context;
    let { error, networkIn, networkOut } = this.state;

    // TODO(burdon): Get all links from config.
    const links = [
      {
        href: 'https://github.com/minderlabs/demo/issues?q=is%3Aissue+is%3Aopen+label%3Abug',
        title: 'Github issues',
        icon: 'report_problem'
      },
      {
        href: 'https://console.firebase.google.com/project/minder-beta/database/data',
        title: 'Firebase',
        icon: 'cloud_circle'
      },
      {
        href: '/graphiql',
        title: 'GraphiQL',
        icon: 'language'
      },
      {
        href: '/admin',
        title: 'Admin console',
        icon: 'graphic_eq'
      },
      {
        href: '/user/profile',
        title: 'Profile',
        icon: 'settings'
      }
    ];

    return (
      <div className="app-status-toolbar ux-toolbar">
        <div>
          <i className="ux-icon ux-icon-action" title="Debug info"
             onClick={ this.handleAction.bind(this, 'bug') }>bug_report</i>

          {
            _.map(links, link => (
            <a key={ link.href } href={ link.href } target="MINDER_CONSOLE">
              <i className="ux-icon ux-icon-action" title={ link.title }>{ link.icon }</i>
            </a>
            ))
          }

          <i className="ux-icon ux-icon-action" title="Get help"
             onClick={ this.showHelp.bind(this) }>live_help</i>
        </div>

        <div className="app-status-info">{ config.app.version }</div>

        <div>
          <i className="ux-icon ux-icon-action" title="Refresh JWT"
             onClick={ this.handleAction.bind(this, 'refresh_id_token') }>security</i>

          <i className="ux-icon ux-icon-action" title="Refresh queries"
             onClick={ this.handleAction.bind(this, 'invalidate_queries') }>refresh</i>

          <i className={ DomUtil.className('app-icon-network-in', 'ux-icon', networkIn && 'ux-icon-on') }></i>
          <i className={ DomUtil.className('app-icon-network-out', 'ux-icon', networkOut && 'ux-icon-on') }></i>
          <i className={ DomUtil.className('ux-icon-error', 'ux-icon', error && 'ux-icon-on') }
             title={ ErrorUtil.message(error.message) }
             onClick={ this.handleClickError.bind(this, 'error') }></i>
        </div>
      </div>
    );
  }
}

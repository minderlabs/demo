//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { Async } from 'minder-core';

import './statusbar.less';

/**
 * Status bar.
 */
export class StatusBar extends React.Component {

  // TODO(burdon): Pass in model?

  static propTypes = {
    config: React.PropTypes.object.isRequired,
    onClick: React.PropTypes.func
  };

  constructor() {
    super(...arguments);

    this._timer = {
      networkIn: Async.timeout(750),
      networkOut: Async.timeout(500)
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

  error(state) {
    this.setState({
      error: state
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
    this.props.onClick && this.props.onClick(icon);
  }

  handleClickError() {
    this.error(false);
  }

  render() {
    let { config } = this.props;

    function state(state) { return state ? ' ux-icon-on' : '' }

    // TODO(burdon): Move to config.
    const github = 'https://github.com/alienlaboratories/react-demos/issues';

    return (
      <div className="app-status-toolbar ux-toolbar">
        <div>
          <i className="ux-icon ux-icon-action" title="Debug info"
             onClick={ this.handleAction.bind(this, 'bug') }>bug_report</i>
          <a href={ github } target="MINDER_GITHUB">
            <i className="ux-icon ux-icon-action" title="Report Bug">report_problem</i>
          </a>
          <a href="/graphiql" target="MINDER_GRAPHIQL" title="GraphiQL">
            <i className="ux-icon ux-icon-action" title="GraphiQL">language</i>
          </a>
          <a href="/admin" target="MINDER_ADMIN">
            <i className="ux-icon ux-icon-action" title="Admin">graphic_eq</i>
          </a>
          <a href="https://console.firebase.google.com/project/minder-beta/database/data" target="MINDER_FIREBASE">
            <i className="ux-icon ux-icon-action" title="Database">cloud_circle</i>
          </a>
        </div>

        <div className="app-status-info">{ config.app.version }</div>

        <div>
          <i className="ux-icon ux-icon-action" title="Refresh queries"
             onClick={ this.handleAction.bind(this, 'refresh') }>refresh</i>

          <i className={ "ux-icon app-icon-network-in" + state(this.state.networkIn) }></i>
          <i className={ "ux-icon app-icon-network-out" + state(this.state.networkOut) }></i>

          <i className={ "ux-icon ux-icon-error" + state(this.state.error) }
             title={ this.state.error }
             onClick={ this.handleClickError.bind(this, 'error') }></i>
        </div>
      </div>
    );
  }
}

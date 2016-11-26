//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import { Async } from 'minder-core';

import './status.less';

/**
 * Status bar.
 */
export class StatusBar extends React.Component {

  // TODO(burdon): Pass in model?

  static propTypes = {
    onClick: React.PropTypes.func
  };

  constructor() {
    super(...arguments);

    this._timer = {
      networkIn: Async.timeout(500),
      networkOut: Async.timeout(500)
    };

    this.state = {
      error: false,
      networkIn: false,
      networkOut: false
    };
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
    function state(state) { return state ? ' app-icon-on' : '' }

    return (
      <div className="app-toolbar app-status-toolbar">
        <div>
          <i className="app-icon app-icon-action material-icons"
             onClick={ this.handleAction.bind(this, 'bug') }>bug_report</i>
          <i className="app-icon app-icon-action material-icons"
             onClick={ this.handleAction.bind(this, 'clients') }>dns</i>
          <i className="app-icon app-icon-action material-icons"
             onClick={ this.handleAction.bind(this, 'graph') }>share</i>
        </div>
        <div>
          <i className="app-icon app-icon-action material-icons"
             onClick={ this.handleAction.bind(this, 'refresh') }>refresh</i>

          <i className={ "app-icon app-icon-network-in material-icons" + state(this.state.networkIn) }></i>
          <i className={ "app-icon app-icon-network-out material-icons" + state(this.state.networkOut) }></i>

          <i className={ "app-icon app-icon-error material-icons" + state(this.state.error) }
             onClick={ this.handleClickError.bind(this, 'error') }></i>
        </div>
      </div>
    );
  }
}

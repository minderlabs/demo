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

    this.state = {
      network: false
    };

    this._netIconTimeout = Async.timeout(500);
  }

  showNetwork() {
    this.setState({
      network: true
    });

    this._netIconTimeout(() => {
      this.setState({
        network: false
      });
    });
  }

  handleClick(icon) {
    this.props.onClick && this.props.onClick(icon);
  }

  render() {
    let netrops = this.state.network ? {} : {
      className: 'app-hidden'
    };

    return (
      <div className="app-toolbar app-status-toolbar">
        <div>
          <i className="app-icon material-icons" onClick={ this.handleClick.bind(this, 'bug') }>bug_report</i>
          <i className="app-icon material-icons" onClick={ this.handleClick.bind(this, 'clients') }>dns</i>
          <i className="app-icon material-icons" onClick={ this.handleClick.bind(this, 'graph') }>share</i>
        </div>
        <div>
          <i className={ "app-icon material-icons " + netrops.className || '' }>wifi</i>
          <i className="app-icon material-icons" onClick={ this.handleClick.bind(this, 'refresh') }>refresh</i>
          <i className="app-icon material-icons" onClick={ this.handleClick.bind(this, 'error') }>check</i>
        </div>
      </div>
    );
  }
}

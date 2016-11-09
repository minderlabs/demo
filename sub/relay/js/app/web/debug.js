//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import './debug.less';

/**
 * Debug sidebar.
 */
export default class Debug extends React.Component {

  render() {
    return (
      <nav className={ 'app-debug-panel' + (this.props.open ? ' app-open' : '') }>
        <div className="app-header">
          <h1>DEBUG</h1>
        </div>
        <div className="app-info">
          <pre className="app-debug">{ JSON.stringify(this.props.info, 0, 2) }</pre>
        </div>
      </nav>
    );
  }
}

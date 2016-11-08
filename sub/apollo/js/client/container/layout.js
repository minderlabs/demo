//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import './layout.less';

/**
 * Root Application.
 */
export default class Layout extends React.Component {

  render() {
    return (
      <div className="app-main-container">
        <div className="app-main-panel">
          <h1>Apollo Redux Demo</h1>
          <div>
            { this.props.children }
          </div>
        </div>
      </div>
    );
  }
}

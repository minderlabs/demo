//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import './sidebar.less';

/**
 * Sidebar nav.
 */
export default class Sidebar extends React.Component {

  // http://codepen.io/chriscoyier/pen/umEgv

  constructor(props, context) {
    super(props, context);

    this.state = {
      open: false
    };
  }

  open() {
    this.setState({
      open: true
    });
  }

  close() {
    this.setState({
      open: false
    });
  }

  toggle() {
    this.open(!this.state.open);
  }

  render() {
    let className = 'app-sidebar-drawer' + (this.state.open ? ' app-open' : '');

    return (
      <div className="app-sidebar">
        <div className={ className }>
          { this.props.sidebar }
        </div>

        { this.props.children }
      </div>
    );
  }
}

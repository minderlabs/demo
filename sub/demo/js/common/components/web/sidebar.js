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

  // TODO(burdon): Nav by keys.
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
    }, () => {
      this.refs.hidden.focus();
    });
  }

  close() {
    this.setState({
      open: false
    });
  }

  toggle(event) {
    // NOTE: Toggle button should preventDefault to not steal focus.
    this.state.open ? this.close() : this.open();
  }

  render() {
    let className = 'app-sidebar-drawer' + (this.state.open ? ' app-open' : '');

    return (
      <div className="app-sidebar">
        <div className={ className }>
          <div>
            <input ref="hidden" onBlur={ this.close.bind(this) }/>
          </div>

          { this.props.sidebar }
        </div>

        { this.props.children }
      </div>
    );
  }
}

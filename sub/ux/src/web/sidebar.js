//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import './sidebar.less';

/**
 * Sidebar nav.
 */
export class Sidebar extends React.Component {

  // TODO(burdon): Nav by keys.
  // http://codepen.io/chriscoyier/pen/umEgv

  constructor() {
    super(...arguments);

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
    let className = _.join(['app-sidebar-drawer', this.state.open ? 'app-open' : ''], ' ');

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

/**
 * Toggle button.
 */
export class SidebarToggle extends React.Component {

  static propTypes = {
    sidebar: React.PropTypes.func.isRequired
  };

  handleToggleSidebar(event) {
    // Don't steal focus (which would cause the sidebar to close).
    event.preventDefault();

    this.props.sidebar().toggle();
  }

  render() {
    return (
      <i className="app-sidebar-toggle material-icons"
         onMouseDown={ this.handleToggleSidebar.bind(this) }>menu</i>
    );
  }
}
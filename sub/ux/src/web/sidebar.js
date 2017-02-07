//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { DomUtil } from 'minder-core';

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
    // NOTE: Race condition with <Link> so use manual onMouseDown to trigger navigation events.
    // http://stackoverflow.com/questions/10652852/jquery-fire-click-before-blur-event
    this.setState({
      open: false
    });
  }

  toggle(event) {
    // NOTE: Toggle button should preventDefault to not steal focus.
    this.state.open ? this.close() : this.open();
  }

  render() {
    return (
      <div className="ux-sidebar">
        <div className={ DomUtil.className('ux-sidebar-drawer', this.state.open && 'ux-open') }>
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
      <i className="ux-icon ux-icon-sidebar-toggle"
         onMouseDown={ this.handleToggleSidebar.bind(this) }>menu</i>
    );
  }
}

//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { Sidebar, SidebarToggle } from '../sidebar';

/**
 * Test List.
 */
export default class TestSidebar extends React.Component {

  render() {
    return (
      <div>
        <Sidebar ref="sidebar">
          <div>A</div>
          <div>B</div>
          <div>C</div>
        </Sidebar>

        <div className="ux-bar">
          <h1>Content</h1>
          <SidebarToggle sidebar={ () => this.refs.sidebar }/>
        </div>
      </div>
    );
  }
}

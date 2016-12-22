//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router'

import { ID } from 'minder-core';
import { List } from 'minder-ux';

import { Path } from '../path';

import './sidebar.less';

/**
 * Sidebar content.
 */
export class SidebarPanel extends React.Component {

  static renderListItem = (item) => (
    <Link key={ item.id } to={ Path.folder(item.alias) }>
      <i className="ux-icon">{ item.icon }</i>
      { item.title }
    </Link>
  );

  render() {
    let { team, folders } = this.props;

    return (
      <div className="app-sidebar ux-column">
        <List items={ folders } renderItem={ SidebarPanel.renderListItem }/>

        <div className="app-divider"/>

        <div className="ux-list">
          <div className="ux-list-item">
            <Link to={ Path.detail('Team', ID.toGlobalId('Group', team)) }>
              <i className="ux-icon">group</i>
              Team
            </Link>
          </div>
        </div>

        <div className="app-divider"/>

        <div className="ux-list">
          <div className="ux-list-item">
            <Link to={ Path.TESTING }>
              <i className="ux-icon">bug_report</i>
              Test
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

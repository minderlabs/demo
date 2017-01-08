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
    <Link key={ item.id } to={ item.link || Path.folder(item.alias) }>
      <i className="ux-icon">{ item.icon }</i>
      { item.title }
    </Link>
  );

  render() {
    let { team, folders } = this.props;

    // TODO(burdon): Configure folder items to allow item nav.
    const items = [
      {
        id: 'group',
        title: 'Team',
        icon: 'group',
        link: Path.detail('Team', ID.toGlobalId('Group', team))
      }
    ];

    const debugItems = [
      {
        id: 'testing',
        title: 'Testing',
        icon: 'bug_report',
        link: Path.TESTING
      },
    ];

    return (
      <div className="app-sidebar ux-column">
        <List items={ folders } renderItem={ SidebarPanel.renderListItem }/>
        <div className="app-divider"/>
        <List items={ items } renderItem={ SidebarPanel.renderListItem }/>
        <div className="app-divider"/>
        <List items={ debugItems } renderItem={ SidebarPanel.renderListItem }/>
      </div>
    );
  }
}

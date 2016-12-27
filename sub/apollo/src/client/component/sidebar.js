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

  static contextTypes = {
    navigator: React.PropTypes.object
  };

  onSelect(path) {
    this.context.navigator.push(path);
  }

  /**
   * Renders the folder.
   * NOTE: We can't use <Link> here since the sidebar's onBlur event is triggered before the Link's onClick.
   * So we manually listen for onMouseDown which happens first.
   */
  renderListItem(list, item) {
    return (
      <div className="ux-row" key={ item.id }
           onMouseDown={ this.onSelect.bind(this, item.link || Path.folder(item.alias)) }>
        <i className="ux-icon">{ item.icon }</i>
        { item.title }
      </div>
    );
  }

  render() {
    let { team, folders } = this.props;

    // TODO(burdon): Query for these by label?
    const items = [
      {
        id: 'group',
        title: 'Team',
        icon: 'group',
        link: Path.detail(ID.toGlobalId('Group', team))
      },
      {
        id: 'demo',
        title: 'Demo',
        icon: 'assignment',
        link: Path.detail(ID.toGlobalId('Project', 'demo'))
      },
      {
        id: 'planning',
        title: 'Planning',
        icon: 'view_column',
        link: Path.page(ID.toGlobalId('Board', 'planning'))
      },
    ];

    const debugItems = [
      {
        id: 'testing',
        title: 'Testing',
        icon: 'bug_report',
        link: Path.TESTING
      }
    ];

    return (
      <div className="app-sidebar ux-column">
        <List items={ folders }
              renderItem={ this.renderListItem.bind(this) }/>
        <div className="app-divider"/>
        <List items={ items }
              renderItem={ this.renderListItem.bind(this) }/>
        <div className="app-divider"/>
        <List items={ debugItems } r
              renderItem={ this.renderListItem.bind(this) }/>
      </div>
    );
  }
}

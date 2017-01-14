//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ID } from 'minder-core';
import { List } from 'minder-ux';

import { Path } from '../path';

import './sidepanel.less';

/**
 * Sidebar content.
 */
export class SidePanel extends React.Component {

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
  // TODO(burdon): Make static.
  itemRenderer(item) {
    return (
      <div className="ux-row" key={ item.id }
           onMouseDown={ this.onSelect.bind(this, item.link || Path.folder(item.alias)) }>
        <i className="ux-icon">{ item.icon }</i>
        <div className="ux-selector">{ item.title }</div>
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
        link: Path.canvas(ID.toGlobalId('Group', team))
      },
      {
        id: 'demo',
        title: 'Demo',
        icon: 'assignment',
        link: Path.canvas(ID.toGlobalId('Project', 'demo'))
      },
      /*
      {
        id: 'demo-board',
        title: 'Demo Board',
        icon: 'view_column',
        link: Path.canvas(ID.toGlobalId('Project', 'demo'), 'board')
      },
      */
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
      <div className="app-sidepanel">
        <List items={ folders }
              itemRenderer={ this.itemRenderer.bind(this) }/>

        <div className="app-divider"/>

        <List items={ items }
              itemRenderer={ this.itemRenderer.bind(this) }/>

        <div className="app-divider"/>

        <List items={ debugItems } r
              itemRenderer={ this.itemRenderer.bind(this) }/>
      </div>
    );
  }
}

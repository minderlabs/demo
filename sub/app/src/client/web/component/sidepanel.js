//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ID } from 'minder-core';
import { List, ListItem } from 'minder-ux';

import { Path } from '../../common/path';

import './sidepanel.less';

/**
 * Sidebar content.
 */
export class SidePanel extends React.Component {

  static ItemRenderer = (typeRegistry) => (item) => {
    let { icon } = item;

    return (
      <ListItem item={ item }>
        <ListItem.Icon icon={ icon || typeRegistry.icon(item) }/>
        <ListItem.Title/>
      </ListItem>
    );
  };

  static propTypes = {
    typeRegistry: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  onSelect(item) {
    let { alias, link } = item;
    this.context.navigator.push(link || (alias && Path.folder(alias)) || Path.canvas(ID.getGlobalId(item)));
  }

  render() {
    let { typeRegistry, folders, group, projects } = this.props;

    const adminItems = [
      // TODO(burdon): Admin ACL.
      {
        id: 'folder-admin',
        title: 'Admin',
        icon: 'build',
        link: Path.ADMIN
      },
      // TODO(burdon): If debug set in config.
      {
        id: 'folder-testing',
        title: 'Testing',
        icon: 'bug_report',
        link: Path.TESTING
      }
    ];

    const FolderList = (props) => (
      <List items={ props.items }
            itemRenderer={ SidePanel.ItemRenderer(typeRegistry) }
            onItemSelect={ this.onSelect.bind(this) }/>
    );

    return (
      <div className="app-sidepanel">
        <FolderList items={ folders }/>
        <div className="app-divider"/>
        <FolderList items={ [ group ] }/>
        <div className="app-divider"/>
        <FolderList items={ projects }/>
        <div className="app-divider"/>
        <FolderList items={ adminItems }/>
      </div>
    );
  }
}

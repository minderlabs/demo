//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ID } from 'minder-core';
import { List, ListItem } from 'minder-ux';

import { Path } from '../path';

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

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  onSelect(item) {
    let {  alias, link } = item;
    this.context.navigator.push(
      link || (alias && Path.folder(alias)) || Path.canvas(ID.getGlobalId(item)));
  }

  render() {
    let { folders, group, projects, typeRegistry } = this.props;
    let itemRenderer = SidePanel.ItemRenderer(typeRegistry);

    // TODO(burdon): List group items.
    const items = [
      {
        id: group,
        type: 'Group',
        title: 'Minder Labs'
      }
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
              itemRenderer={ itemRenderer } onItemSelect={ this.onSelect.bind(this) }/>

        <div className="app-divider"/>

        <List items={ items }
              itemRenderer={ itemRenderer } onItemSelect={ this.onSelect.bind(this) }/>

        <div className="app-divider"/>

        <List items={ projects }
              itemRenderer={ itemRenderer } onItemSelect={ this.onSelect.bind(this) }/>

        <div className="app-divider"/>

        <List items={ debugItems }
              itemRenderer={ itemRenderer } onItemSelect={ this.onSelect.bind(this) }/>
      </div>
    );
  }
}

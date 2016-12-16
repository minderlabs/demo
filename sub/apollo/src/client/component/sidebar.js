//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router'

import { ID } from 'minder-core';

import { Path } from '../path';

/**
 * Sidebar content.
 */
export class SidebarPanel extends React.Component {

  render() {
    let { team, folders } = this.props;

    console.log('>>>>>>>>>>', folders);

    return (
      <div className="ux-column ux-list">
        {_.map(folders, folder =>
          <Link key={ folder.id } className="ux-list-item" to={ Path.folder(folder.alias) }>{ folder.title }</Link>
        )}

        {/*
        <Link className="ux-list-item" to={ Path.folder('inbox') }>Inbox</Link>
        <Link className="ux-list-item" to={ Path.folder('tasks') }>Tasks</Link>
        <Link className="ux-list-item" to={ Path.folder('favorites') }>Favorites</Link>
        <Link className="ux-list-item" to={ Path.folder('projects') }>Projects</Link>
        <Link className="ux-list-item" to={ Path.folder('deleted') }>Deleted</Link>
        */}

        <Link className="ux-list-item" to={ Path.detail('Team', ID.toGlobalId('Group', team)) }>Team</Link>

        <Link className="ux-list-item" to={ Path.TESTING }>Test</Link>
      </div>
    );
  }
}

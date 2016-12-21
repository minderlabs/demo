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

  // TODO(burdon): Show icon.

  render() {
    let { team, folders } = this.props;

    return (
      <div className="ux-column ux-list">
        {_.map(folders, folder =>
          <Link key={ folder.id } className="ux-list-item" to={ Path.folder(folder.alias) }>{ folder.title }</Link>
        )}

        <Link className="ux-list-item" to={ Path.detail('Team', ID.toGlobalId('Group', team)) }>Team</Link>
        <Link className="ux-list-item" to={ Path.TESTING }>Test</Link>
      </div>
    );
  }
}

//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router'

import { ID } from 'minder-core';

import { Path } from '../../path';

/**
 *
 */
export class Folders extends React.Component {

  // TODO(burdon): Folders query.

  render() {
    return (
      <div className="ux-column ux-list">
        <Link className="ux-list-item" to={ Path.folder('inbox') }>Inbox</Link>
        <Link className="ux-list-item" to={ Path.folder('favorites') }>Favorites</Link>
        <Link className="ux-list-item" to={ Path.folder('deleted') }>Deleted</Link>

        <Link className="ux-list-item" to={ Path.detail('Team', ID.toGlobalId('Group', 'minderlabs')) }>Team</Link>
      </div>
    );
  }
}

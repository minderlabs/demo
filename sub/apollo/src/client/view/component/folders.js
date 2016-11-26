//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { Link } from 'react-router'

import { ID } from 'minder-core';

import { Path } from '../../path';

import './folders.less';

/**
 *
 */
export class Folders extends React.Component {

  // TODO(burdon): Folders query.

  render() {
    return (
      <div className="app-folder-items app-column">
        <Link to={ Path.folder('inbox') }>Inbox</Link>
        <Link to={ Path.folder('favorites') }>Favorites</Link>
        <Link to={ Path.folder('deleted') }>Deleted</Link>

        <Link to={ Path.detail('Team', ID.toGlobalId('Group', 'minderlabs')) }>Team</Link>
      </div>
    );
  }
}

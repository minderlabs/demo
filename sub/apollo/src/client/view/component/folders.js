//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { Link } from 'react-router'

import { ID } from 'minder-core';

import './folders.less';

/**
 *
 */
export class Folders extends React.Component {

  // TODO(burdon): Folders query.

  render() {
    return (
      <div className="app-folder-items app-column">
        <Link to="/inbox">Inbox</Link>
        <Link to="/favorites">Favorites</Link>
        <Link to="/deleted">Deleted</Link>

        <Link to={ '/team/' + ID.toGlobalId('Group', 'minderlabs') }>Team</Link>
      </div>
    );
  }
}

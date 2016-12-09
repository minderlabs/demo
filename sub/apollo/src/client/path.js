//
// Copyright 2016 Minder Labs.
//

import { goBack, push } from 'react-router-redux'

import { ID } from 'minder-core';


/**
 * Router paths.
 */
export class Path {

  // TODO(burdon): Share with server.

  static ROOT = '/app';
  static HOME = '/app/inbox';

  static folder(alias) {
    return `/app/${alias}`;
  }

  static detail(view, itemId) {
    return `/app/${view}/${itemId}`;
  }
}

/**
 * Encapsulates navigation using the redux dispatcher.
 * Higher-level views can construct this and pass down so that children don't need to perform navigation directly.
 */
export class Navigator {
  constructor(dispatch) {
    this.dispatch = dispatch;
  }

  goBack() {
    this.dispatch(goBack());
  }

  toDetail(item) {
    this.dispatch(push(Path.detail(item.type, ID.toGlobalId(item.type, item.id))));
  }
}

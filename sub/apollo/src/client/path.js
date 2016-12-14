//
// Copyright 2016 Minder Labs.
//

import { goBack, goForward, push } from 'react-router-redux'

import { ID } from 'minder-core';

/**
 * Router paths.
 */
export class Path {

  // TODO(burdon): Share with server.

  static ROOT     = '/app';
  static HOME     = '/app/inbox';
  static TESTING  = '/app/testing';

  /**
   * Creates a URL for the given folder.
   *
   * @param alias Name that corresponds to an alias property in a Folder item.
   * @return {string}
   */
  static folder(alias) {
    return `${Path.ROOT}/${alias}`;
  }

  /**
   * Creates a URL for the given item.
   *
   * @param view    Card view type.
   * @param itemId  Global ID.
   * @return {string}
   */
  static detail(view, itemId) {
    return `${Path.ROOT}/${view}/${itemId}`;
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

  goForward() {
    this.dispatch(goForward());
  }

  pushDetail(item) {
    this.dispatch(push(Path.detail(item.type, ID.toGlobalId(item.type, item.id))));
  }
}

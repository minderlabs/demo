//
// Copyright 2016 Minder Labs.
//

import { goBack, goForward, push } from 'react-router-redux';

import { ID } from 'minder-core';

// TODO(burdon): Share with server.
const ROOT = '/app';

/**
 * Router paths.
 */
export class Path {

  static ROOT     = ROOT;
  static HOME     = ROOT + '/inbox';
  static BOARD    = ROOT + '/board';
  static TESTING  = ROOT + '/testing';

  /**
   * Route path
   * @param args Ordered array of args to be resolved.
   * @returns {string}
   */
  static route(args) {
    return Path.ROOT + '/' + _.map(args, arg => ':' + arg).join('/');
  }

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

  // TODO(burdon): Board layout.
  static board(itemId) {
    return `${Path.ROOT}/board/${itemId}`;
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

  push(path) {
    this.dispatch(push(path));
  }

  pushDetail(item) {
    this.dispatch(push(Path.detail(item.type, ID.toGlobalId(item.type, item.id))));
  }
}

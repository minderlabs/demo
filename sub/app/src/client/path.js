//
// Copyright 2016 Minder Labs.
//

import { goBack, goForward, push } from 'react-router-redux';

import { ID } from 'minder-core';

// TODO(burdon): Share with server.
const ROOT = '/app';

/**
 * Router paths.
 *
 * LAYOUT: E.g., Column (mobile, crx), Master-Detail (web)
 * CANVAS: E.g., List, Card, Board
 * ITEM: ID
 */
export class Path {

  // TODO(burdon): Rename detail and page (formerly board).
  // List, Card, Full screen (aka board).
  // Board can be rendered as a list item, card, or full screen. Fix TypeRegistry to understand.

  // app/inbox          Inbox
  // app/favorites      Favorites with Item xxx selected (e.g., if WebLayout).
  // app/card/xxx       Card canvas Item xxx
  // app/board/xxx      Board canvas

  // [BaseLayout]:SurfaceLayout => CanvasView

  // TODO(burdon): Canvases support different form-factors.

  static ROOT     = ROOT;
  static HOME     = ROOT + '/inbox';
  static TESTING  = ROOT + '/testing';
  // TODO(madadam): Put the accounts page under /app root.
  static ACCOUNTS = '/accounts';

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
   * Creates a URL for the given canvas.
   *
   * @param itemId  Global ID.
   * @param canvas
   * @return {string}
   */
  // TODO(burdon): Preserve current layout.
  static canvas(itemId, canvas='card') {
    return `${Path.ROOT}/${canvas}/${itemId}`;
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
    this.dispatch(push(Path.canvas(ID.toGlobalId(item.type, item.id))));
  }
}

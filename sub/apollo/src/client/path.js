//
// Copyright 2016 Minder Labs.
//

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

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * Data model.
 */
export class ListModel {

  // TODO(burdon): Adapt to work (or have same interface) with native.
  // TODO(burdon): Same abstraction used by Android (ListView.DataSource)?

  constructor(path) {
    this._path = path;
    this._listener = null;
  }

  // TODO(burdon): Is this the right pattern for React? (compare with native).
  setListener(listener) {
    this._listener = listener;
    return this;
  }

  update() {
    // TODO(burdon): react-native uses different transport.
    $.get(this._path, (result) => {
      this._listener(result);
    });

    return this;
  }

  insert(title) {
    console.log('Insert: ' + title);
  }
}

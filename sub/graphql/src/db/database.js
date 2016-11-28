//
// Copyright 2016 Minder Labs.
//

'use strict';

import { IdGenerator, Matcher } from 'minder-core';

/**
 * Base database implementation.
 */
export class Database {

  // TODO(burdon): Logger.

  static IdGenerator = new IdGenerator(1000);

  constructor() {

    // Query matcher.
    this._matcher = new Matcher();

    // Callback.
    this._onMutation = null;
  }

  // TODO(burdon): Evolve into mutation dispatcher to query registry.
  onMutation(callback) {
    this._onMutation = callback;
    return this;
  }

  /**
   *
   * @param context
   * @param items
   */
  upsertItems(context, items) {
    throw 'Not implemented';
  }

  /**
   *
   * @param context
   * @param type
   * @param itemIds
   */
  getItems(context, type, itemIds) {
    throw 'Not implemented';
  }

  /**
   *
   * @param context
   * @param filter
   * @param offset
   * @param count
   */
  queryItems(context, filter={}, offset=0, count=10) {
    throw 'Not implemented';
  }
}

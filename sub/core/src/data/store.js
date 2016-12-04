//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * Base class for type-specific stores.
 */
export class ItemStore {

  // TODO(burdon): Dispatch by domain not type.
  // TODO(burdon): ID should contain type.

  constructor(matcher) {
    console.assert(matcher);
    this._matcher = matcher
  }

  /**
   * Upsert the given items.
   *
   * @param context
   * @param items
   */
  upsertItems(context, items) {
    throw 'Not implemented';
  }

  /**
   * Retrieve the items by ID.
   *
   * @param context
   * @param type
   * @param itemIds
   */
  getItems(context, type, itemIds) {
    throw 'Not implemented';
  }

  /**
   * Query items based on the supplied filter against the store's matcher.
   *
   * @param context
   * @param root
   * @param filter
   * @param offset
   * @param count
   */
  queryItems(context, root, filter={}, offset=0, count=10) {
    throw 'Not implemented';
  }
}

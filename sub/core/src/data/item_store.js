//
// Copyright 2016 Minder Labs.
//

import moment from 'moment';

/**
 * Base class for read-only stores.
 */
export class QueryProcessor {

  /**
   * @param idGenerator
   * @param matcher
   * @param namespace
   */
  constructor(idGenerator, matcher, namespace) {
    console.assert(idGenerator && matcher && namespace);

    this._idGenerator = idGenerator;
    this._matcher = matcher;
    this._namespace = namespace;
  }

  get namespace() {
    return this._namespace;
  }

  queryItems(context, root, filter = {}, offset = 0, count = 10) {
    throw new Error('Not implemented');
  }
}

/**
 * Base class for type-specific stores.
 */
export class ItemStore extends QueryProcessor {

  constructor(idGenerator, matcher, namespace) {
    super(idGenerator, matcher, namespace);
  }

  /**
   * Update the timestamps and set ID if create.
   * @param item
   * @return {*}
   */
  _onUpdate(item) {
    let ts = moment().unix();

    if (!item.id) {
      item.id = this._idGenerator.createId();
      item.created = ts;
    }

    item.modified = ts;
    return item;
  }

  //
  // Helper methods.
  //

  getItem(context, type, itemId) {
    return this.getItems(context, type, [itemId]).then(items => items[0]);
  }

  upsertItem(context, item) {
    return this.upsertItems(context, [item]).then(items => items[0]);
  }

  /**
   * Upsert the given items.
   *
   * @param context
   * @param items
   */
  upsertItems(context, items) {
    throw new Error('Not implemented');
  }

  /**
   * Retrieve the items by ID.
   *
   * @param context
   * @param type
   * @param itemIds
   */
  getItems(context, type, itemIds) {
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  }
}

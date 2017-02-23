//
// Copyright 2016 Minder Labs.
//

import moment from 'moment';

/**
 * Abstract base class.
 */
export class QueryProcessor {

  static DEFAULT_COUNT = 20;

  constructor(namespace) {
    console.assert(namespace);
    this._namespace = namespace;
  }

  get namespace() {
    return this._namespace;
  }

  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    throw new Error('Not implemented');
  }
}

/**
 * Abstract base class.
 */
export class ItemStore extends QueryProcessor {

  /**
   * Update the timestamps and set ID if create.
   * @param idGenerator
   * @param item
   * @return {*}
   */
  static onUpdate(idGenerator, item) {
    console.assert(item.type);

    let ts = moment().unix();
    if (!item.id) {
      item.id = idGenerator.createId();
      item.created = ts;
    }

    item.modified = ts;
    return item;
  }

  constructor(namespace) {
    super(namespace);
  }

  getItem(context, type, itemId) {
    return this.getItems(context, type, [itemId]).then(items => items[0]);
  }

  upsertItem(context, item) {
    return this.upsertItems(context, [item]).then(items => items[0]);
  }

  getItems(context, type, itemIds) {
    throw new Error('Not implemented');
  }

  upsertItems(context, items) {
    throw new Error('Not implemented');
  }
}

/**
 * Wraps another ItemStore.
 */
export class DelegateItemStore extends ItemStore {

  constructor(itemStore) {
    super(itemStore.namespace);
    this._itemStore = itemStore;
  }

  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    return this._itemStore.queryItems(context, root, filter, offset, count);
  }

  getItems(context, type, itemIds) {
    return this._itemStore.getItems(context, type, itemIds);
  }

  upsertItem(context, item) {
    return this._itemStore.upsertItems(context, items);
  }
}

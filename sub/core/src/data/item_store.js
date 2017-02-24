//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { TypeUtil } from '../util/type';

/**
 * Wrapper for item filtering and sorting.
 */
export class ItemUtil {

  /**
   * Sort items.
   * @param items
   * @param filter
   * @return {*}
   */
  static sortItems(items, filter) {
    let orderBy = filter.orderBy;
    if (orderBy) {
      console.assert(orderBy.field);
      items = _.orderBy(items, [orderBy.field], [orderBy.order === 'DESC' ? 'desc' : 'asc']);
    }

    return items;
  }

  constructor(idGenerator, matcher) {
    console.assert(idGenerator && matcher);
    this._idGenerator = idGenerator;
    this._util = matcher;
  }

  /**
   * Update the timestamps and set ID if create.
   * @param item
   * @return {*}
   */
  onUpdate(item) {
    console.assert(item && item.type);

    let ts = moment().unix();
    if (!item.id) {
      item.id = this._idGenerator.createId();
      item.created = ts;
    }

    item.modified = ts;
    return item;
  }

  /**
   * Filter and sort list of items.
   *
   * @param itemIterator
   * @param context
   * @param root
   * @param filter
   * @param offset
   * @param count
   * @returns {Array}
   */
  filterItems(itemIterator, context, root, filter, offset, count) {
    let items = [];

    // Match items.
    itemIterator.forEach(item => {
      if (this._util.matchItem(context, root, filter, item)) {
        items.push(item);
      }
    });

    // Sort.
    items = ItemUtil.sortItems(items, filter);

    // Page.
    items = _.slice(items, offset, offset + count);

    return items;
  }
}

/**
 * Cache.
 */
export class ItemStoreCache {

  constructor(idGenerator, matcher) {
    console.assert(idGenerator && matcher);
    this._util = new ItemUtil(idGenerator, matcher);

    // Items by ID.
    // TODO(burdon): Index by bucket also.
    this._items = new Map();
  }

  queryItems(context, root, filter, offset, count) {
    console.assert(context && filter);
    let items = this._util.filterItems(this._items, context, root, filter, offset, count);
    return _.map(items, item => TypeUtil.clone(item));
  }

  getItems(itemIds) {
    console.assert(itemIds);
    let items = _.compact(_.map(itemIds, itemId => this._items.get(itemId)));
    return _.map(items, item => TypeUtil.clone(item));
  }

  upsertItems(items) {
    console.assert(items);
    return _.map(items, item => {
      let clonedItem = this._util.onUpdate(TypeUtil.clone(item));
      this._items.set(clonedItem.id, clonedItem);
      return clonedItem;
    });
  }
}

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

  upsertItems(context, items) {
    return this._itemStore.upsertItems(context, items);
  }
}

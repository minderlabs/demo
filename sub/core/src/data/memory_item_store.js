//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { TypeUtil } from '../util/type';
import { ItemStore } from './item_store';

/**
 * In-memory database.
 */
export class MemoryItemStore extends ItemStore {

  constructor(idGenerator, matcher) {
    super(idGenerator, matcher);

    // Items by ID.
    this._items = new Map();
  }

  upsertItems(context, items) {
    console.assert(context && items);

    return Promise.resolve(_.map(items, (item) => {
      item = TypeUtil.clone(item);

      console.assert(item.type);

      // TODO(burdon): Factor out to MutationProcessor (then remove idGenerator requirement).
      if (!item.id) {
        item.id = this._idGenerator.createId();
        item.created = moment().unix();
      }

      item.modified = moment().unix();

      // TODO(burdon): Enforce immutable properties (e.g., type).
      this._items.set(item.id, item);

      return item;
    }));
  }

  getItems(context, type, itemIds) {
    console.assert(context && type && itemIds);

    return Promise.resolve(_.map(itemIds, itemId => TypeUtil.clone(this._items.get(itemId) || {})));
  }

  queryItems(context, root, filter={}, offset=0, count=10) {
    console.assert(context && filter);

    let items = [];
    this._items.forEach(item => {
      if (!this._matcher.matchItem(context, root, filter, item)) {
        return;
      }

      items.push(TypeUtil.clone(item));
    });

    // Sort.
    let orderBy = filter.orderBy;
    if (orderBy) {
      console.assert(orderBy.field);
      items = _.orderBy(items, [orderBy.field], [orderBy.order === 'DESC' ? 'desc' : 'asc']);
    }

    // Page.
    items = _.slice(items, offset, offset + count);

    return Promise.resolve(items);
  }
}

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

  // TODO(burdon): Add namespace to items? Or add in database/resolver layer?

  constructor(idGenerator, matcher, namespace) {
    super(idGenerator, matcher, namespace);

    // Items by ID.
    this._items = new Map();
  }

  //
  // ItemStore interface.
  //

  upsertItems(context, items) {
    console.assert(context && !_.isEmpty(items));

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
    console.assert(context && type);

    // Return clones of matching items.
    let items = _.compact(_.map(itemIds, itemId => this._items.get(itemId)));
    return Promise.resolve(_.map(items, item => TypeUtil.clone(item)));
  }

  //
  // QueryProcessor interface.
  //

  queryItems(context, root, filter={}, offset=0, count=10) {
    console.assert(context && filter);

    // Match items (cloning those that match).
    let items = [];
    this._items.forEach(item => {
      if (this._matcher.matchItem(context, root, filter, item)) {
        items.push(TypeUtil.clone(item));
      }
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

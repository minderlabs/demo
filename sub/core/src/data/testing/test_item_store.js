//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Async } from '../../util/async';

import { ItemStore, QueryProcessor } from '../item_store';

/**
 * Dispatching item store with delayed dispatching.
 */
export class TestItemStore extends ItemStore {

  // TODO(burdon): Random delay.
  // TODO(burdon): Random 500s (retry).

  constructor(itemStore, options) {
    super(itemStore.namespace);
    console.assert(itemStore);
    this._itemStore = itemStore;
    this._options = _.defaults({}, options, {
      delay: 1000
    });
  }

  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    return Async.delay(this._options.delay).then(() => {
      return this._itemStore.queryItems(context, root, filter, offset, count);
    });
  }

  getItems(context, type, itemIds) {
    return Async.delay(this._options.delay).then(() => {
      return this._itemStore.getItems(context, type, itemIds);
    });
  }

  upsertItems(context, items) {
    return Async.delay(this._options.delay).then(() => {
      return this._itemStore.upsertItems(context, items);
    });
  }
}

//
// Copyright 2016 Minder Labs.
//

import { ItemStoreCache, ItemStore, QueryProcessor } from './item_store';

/**
 * In-memory database.
 */
export class MemoryItemStore extends ItemStore {

  // TODO(burdon): Store by bucket? Use context?

  constructor(idGenerator, matcher, namespace) {
    super(namespace);

    this._cache = new ItemStoreCache(idGenerator, matcher);
  }

  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    return Promise.resolve(this._cache.queryItems(context, root, filter, offset, count));
  }

  getItems(context, type, itemIds) {
    return Promise.resolve(this._cache.getItems(itemIds));
  }

  upsertItems(context, items) {
    return Promise.resolve(this._cache.upsertItems(items));
  }
}

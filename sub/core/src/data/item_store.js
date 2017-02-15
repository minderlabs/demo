//
// Copyright 2016 Minder Labs.
//

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
    throw 'Not implemented';
  }
}

/**
 * Base class for type-specific stores.
 */
export class ItemStore extends QueryProcessor {

  constructor(idGenerator, matcher, namespace) {
    super(idGenerator, matcher, namespace);
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

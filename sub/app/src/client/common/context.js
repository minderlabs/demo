//
// Copyright 2017 Minder Labs.
//

import { Database } from 'minder-core';

const logger = Logger.get('context');

/**
 * App context.
 */
export class ContextManager {

  // TODO(burdon): Clean-up cloning in mutations and reducer.
  // TODO(burdon): Update Injector from CRX context.

  // To test from console:
  // let TEST_CONTEXT = { items: [{ type: 'Contact', title: 'Alice Braintree' }] };
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: TEST_CONTEXT });
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: { items: undefined }});

  constructor(idGenerator) {
    console.assert(idGenerator);
    this._idGenerator = idGenerator;

    // Current context.
    this._context = {};

    // Cached items.
    // TODO(burdon): Could this go stale?
    this._cache = new Map();
  }

  /**
   * {
   *   items: [{Item}]
   * }
   */
  get context() {
    return this._context;
  }

  /**
   * Update the context.
   * @param context
   * @returns {ContextManager}
   */
  updateContext(context={}) {
    logger.log('Context updated: ' + JSON.stringify(context));
    this._context = context || {};
    return this;
  }

  /**
   * Update the cache.
   * Cached items come from the HOC query that uses this context.
   * @param items
   */
  updateItems(items=[]) {
    logger.log('Cache updated: ' + _.map(items, i => i.id));
    _.each(items, item => {
      this._cache.set(item.id, item);
    });
  }

  /**
   * Inject contextual items into the current list results.
   *
   * @param items Items passed to List control.
   * @return {*}
   */
  injectItems(items) {
    _.each(_.get(this._context, 'items'), item => {

      // TODO(burdon): Generalize match (by fkey instead of email).

      // Look for item in cache.
      let match = _.find(this._cache, cachedItem => {
        if (cachedItem.email == item.email) {
          return cachedItem;
        }
      });
      if (match) {
        item = match;
      }

      // Look for item in current list.
      let currentIdx = _.findIndex(items, listItem => {
        if (listItem.type == item.type && listItem.email == item.email) {
          return true;
        }
      });

      // If matched then move list item to front.
      if (currentIdx != -1) {
        // Move to front.
        let removed = items.splice(currentIdx, 1);
        items.unshift(removed[0]);
      } else {
        // Prepend context item.
        items.unshift(_.defaults(item, {
          namespace: Database.NAMESPACE.LOCAL,
          id: this._idGenerator.createId()
        }));
      }
    });

    return items;
  }
}

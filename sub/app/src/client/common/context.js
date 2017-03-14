//
// Copyright 2017 Minder Labs.
//

import { Database } from 'minder-core';

const logger = Logger.get('context');

/**
 * App context.
 *
 * - Content Script registers an Inspector for the current web page
 *   (e.g., Inbox, Gmail, Testing at localhost:3000/testing/crx)
 * - On a DOM change the Inspector looks for the current contact (name and email).
 * - The Content Script sends a message to the Sidebar App, which fires a Redux action (ContextAction.ACTION.UPDATE),
 *   which updates the context state.
 * - The Finder activity listens to Redux state changes and uses the context to query (by email)
 *   for possible saved Contacts; it also updates the global (Injected) ContextManager.
 * - When the query returns the Finder is rendered; this renders the CardSearchList, which has an
 *   itemInjector property (which is connected to the ContextManager).
 * - During render the List passed its items (from the query) to the itemInjector,
 *   which returns a new set of items to render.
 * - The ContextManager's itemInjector does the following:
 *   - If the query returns an item that matches the context then it is promoted to the front of the list.
 *   - If not, the ContextManager creates a transient item (with the LOCAL namespace) and unshifts this
 *     to the front of the list.
 *   - The item is cached by the ContextManager, and will be used in subsequent renders.
 * - If the context item is mutated (e.g., a task is added) then the Mutator clones the transient item
 *   and changes its namespace to the USER namespace and submits the Mutation.
 * - The optimistic reducer then plants this new USER item into the cache
 *   (and triggers a list re-render -- in which case the ContextManager sees a non-transient USER item).
 * - The list is re-rendered after the Mutation response is received by the server (nothing changes given
 *   the optimistic response).
 * - Now, when the context changes the same process begins again, but when the context shifts back
 *   to the previous context, the non-transient item is shown (i.e., with its tasks).
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
    // TODO(burdon): Could this go stale? Pass in apollo cache?
    // TODO(burdon): Why do we cache since email query happens each time?
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

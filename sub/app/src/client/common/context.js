//
// Copyright 2017 Minder Labs.
//

import { Database } from 'minder-core';

const logger = Logger.get('context');

/**
 * Application Context.
 *
 * See context.png
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

  // To test from console:
  // let TEST_CONTEXT = { items: [{ type: 'Contact', title: 'Alice Braintree' }] };
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: TEST_CONTEXT });
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: { items: undefined }});

  constructor(idGenerator) {
    console.assert(idGenerator);
    this._idGenerator = idGenerator;

    // Current context.
    this._context = {};

    // TODO(burdon): Convert to map and use _.toArray()
    // Transient items indexed by foreign key (i.e., email).
    this._transientItems = new Map();

    this._cache = this.clearCache();
  }

  clearCache() {
    // Cached items matching the current context.
    // NOTE: Plain object map instead of Map so can be iterated using _.find().
    this._cache = {};
    return this._cache;
  }

  /**
   * Returns a filter to query for contextual items.
   *
   * @returns {FilterInput} Context filter or undefined.
   */
  getFilter() {

    // TODO(madadam): Unify email stuff to be keyValue pairs with key 'email', and rewrite the query
    // on the server side like follows.

    // TODO(burdon): Email-specific.
    // TODO(burdon): Push DOM node (server does more processing -- incl. creating transient item?)
    let emails = _.compact(_.map(_.get(this._context, 'items'), item => item.email));
    if (emails.length) {
      return {
        type: 'Contact',
        expr: {
          op: 'OR',
          expr: _.map(emails, email => ({
            field: 'email',
            value: {
              string: email
            }
          }))
        }
      };
    }

    // TODO(madadam): this._context should be the KeyValue array, get rid of extra level of object.
    if (this._context.context) {
      return {
        context: this._context.context
      }
    }
  }

  /**
   * Updates the context when the ContextAction updates the Redux store's state.
   *
   * @param context
   * @returns {ContextManager}
   */
  updateContext(context={}) {
    logger.log('Updated context: ' + JSON.stringify(context));
    this._context = context || {};

    _.each(_.get(this._context, 'items'), item => {
      if (item.email) {
        // TODO(burdon): Update (rather than replace) old transient item (keep ID).
        // TODO(burdon): Potentially update stored item with additional context?
        this._transientItems.set(item.email, _.defaults(item, {
          namespace: Database.NAMESPACE.LOCAL,
          id: this._idGenerator.createId()
        }));
      }
    });

    return this;
  }

  /**
   * Updates the cache with results from the ContextQuery.
   *
   * @param items
   */
  updateCache(items) {
    logger.log('Updated cache: ' + JSON.stringify(_.map(items, i => _.pick(i, ['id', 'type', 'email']))));

    this.clearCache();

    _.each(items, item => {
      // TODO(madadam): cache by foreign key instead of email?
      let email = item.email;
      console.assert(email);
      this._cache[email] = item;
    });
  }

  /**
   * Inject contextual items into the current list results.
   *
   * @param items Items returned by the List's HOC query.
   * @return {[{Item]}
   */
  injectItems(items) {
    let itemsByKey = new Map();

    // For each transient item in the context.
    _.each(_.get(this._context, 'items'), item => {
      // TODO(madadam): Use id or foreign key as key.
      if (item.email) {
        item = this._transientItems.get(item.email);

        // Replace the transient item with the stored cached item.
        let match = this.findMatch(this._cache, item);
        if (match) {
          item = match;
          itemsByKey.set(item.email, item);
        }

        // Look for item in current list.
        let current = this.findMatch(items, item);
        if (current) {
          // Promote to front.
          _.remove(items, i => i.id == current.id);
          items.unshift(current);
        } else {
          // Prepend context item.
          items.unshift(item);
        }
      }
    });

    // Inject remaining cached items that *didn't* match any of the "contextual" (synthetic client-side) items.
    _.each(this._cache, item => {
      if (item.email && itemsByKey.get(item.email)) {
        return;
      }
      items.push(item);
    });

    return items;
  }

  /**
   * Match collection against item.
   * @param items
   * @param item
   */
  findMatch(items, item) {
    return _.find(items, i => {
      // TODO(burdon): Generalize match (by fkey instead of email).
      if (item.type === i.type && item.email === i.email) {
        return true;
      }
    });
  }
}

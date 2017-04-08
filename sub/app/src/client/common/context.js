//
// Copyright 2017 Minder Labs.
//

import { Database, ItemUtil } from 'minder-core';

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

  // TODO(burdon): Generalize key (depends on inspector type).
  static FKEY = 'email';
  static TYPE = 'Contact';

  // To test from console:
  // let TEST_CONTEXT = { items: [{ type: 'Contact', title: 'Alice Braintree' }] };
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: TEST_CONTEXT });
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: { items: undefined }});

  constructor(idGenerator) {
    console.assert(idGenerator);
    this._idGenerator = idGenerator;

    // Current context.
    this._context = {};

    // Stored Items matching the current context.
    this._contextItemsByKey = null;

    // Transient items (generated by inspectors) indexed by foreign key (i.e., email).
    this._transientItems = new Map();
  }

  /**
   * Returns a filter to query for contextual items.
   *
   * @returns {FilterInput} Context filter or undefined.
   */
  getFilter() {

    // TODO(madadam): Unify email stuff to be keyValue pairs (e.g., key='email').
    // TODO(burdon): Push DOM node (server does more processing -- incl. creating transient item?)

    let keys = _.compact(_.map(_.get(this._context, 'items'), item => {
      if (item.type === ContextManager.TYPE) {
        return _.get(item, ContextManager.FKEY);
      }
    }));

    if (keys.length) {
      return {
        type: ContextManager.TYPE,
        expr: {
          op: 'OR',
          expr: _.map(keys, key => ({
            field: ContextManager.FKEY,
            value: {
              string: key
            }
          }))
        }
      };
    } else {
      // TODO(madadam): this._context should be the KeyValue array, get rid of extra level.
      if (this._context.context) {
        return {
          context: this._context.context
        }
      }
    }
  }

  /**
   * Updates the context when the ContextAction updates the Redux store's state.
   *
   * @param userProfile
   * @param context
   * @returns {ContextManager}
   */
  updateContext(userProfile, context={}) {
    logger.log('Updated context: ' + JSON.stringify(context));
    this._context = context || {};

    // Reset.
    this._transientItems.clear();

    // Track transient items from the context.
    let { items } = this._context;
    _.each(items, item => {
      let fkey = _.get(item, ContextManager.FKEY);
      if (fkey && fkey !== userProfile.email) {
        // Create transient item with temporary key.
        let transientItem = _.defaults(item, {
          namespace: Database.NAMESPACE.LOCAL,
          id: this._idGenerator.createId()
        });

        this._transientItems.set(fkey, transientItem);
      }
    });

    return this;
  }

  /**
   * Updates the cache with results from the ContextQuery.
   *
   * @param items
   */
  updateContextItems(items) {
    logger.log('Updated cache: ' + JSON.stringify(_.map(items, i => _.pick(i, ['id', 'type', ContextManager.FKEY]))));
    this._contextItemsByKey = ItemUtil.createItemMap(items, ContextManager.FKEY);
  }

  /**
   * Inject contextual items into the current list results.
   *
   * @param items Items returned by the List's HOC query.
   * @return {[{Item]}
   */
  injectItems(items) {
    let itemsResult = [];

    // Track items in list.
    let itemsById = new Map();
    let itemsByKey = ItemUtil.createItemMap(items, ContextManager.FKEY);

    //
    // First inject (or replace) context items.
    // Existing List items (e.g., search) may contain non-transient items from the context.
    //
    this._transientItems.forEach(item => {
      let fkey = _.get(item, ContextManager.FKEY);

      // Check if exists in list result and if so mark it as used.
      let listItem = itemsByKey.get(fkey);
      if (listItem) {
        item = listItem;
      }

      // Check if exists in context and if so replace (takes precedence from list since could be fresher).
      let contextItem = this._contextItemsByKey.get(fkey);
      if (contextItem) {
        item = contextItem;
      }

      // Track items in the result.
      itemsResult.push(item);
      itemsById.set(item.id, item);
    });

    //
    // Next, add the remaining List items.
    //
    _.each(items, item => {
      if (!itemsById.get(item.id)) {
        itemsResult.push(item);
      }
    });

    return itemsResult;
  }
}

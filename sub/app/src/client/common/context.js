//
// Copyright 2017 Minder Labs.
//

import { Database } from 'minder-core';

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

  constructor(idGenerator, state=undefined) {
    console.assert(idGenerator);
    this._idGenerator = idGenerator;
    this._state = state;
  }

  /**
   * Inject contextual items into the current list results.
   * @param items
   * @return {*}
   */
  injectItems(items) {

    // TODO(burdon): query store directly to get items (and cache): so doesn't mutate/copy.
    // TODO(burdon): FCM push should push back to sender (since other tabs). AND check push token is unique.

    _.each(_.get(this._state, 'items'), item => {

      // TODO(burdon): Generalize match (by fkey).
      // Move existing item to the front or replace.
      let currentIdx = _.findIndex(items, i => {
        if (i.type == item.type && i.email == item.email) {
          return true;
        }
      });

      if (currentIdx != -1) {
        console.log('### EXISTING: ' + JSON.stringify(_.pick(items[currentIdx], ['id', 'type', 'title'])));

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

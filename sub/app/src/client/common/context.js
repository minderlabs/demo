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
  // let TEST_CONTEXT = { item: { type: 'Contact', title: 'Alice Braintree' } };
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: TEST_CONTEXT });
  // minder.store.dispatch({ type: 'MINDER_CONTEXT/UPDATE', context: { item: undefined } });

  constructor(idGenerator, state=undefined) {
    console.assert(idGenerator);
    this._idGenerator = idGenerator;
    this._state = state;
  }

  injectItems(items) {

    // TODO(burdon): Replace if existing.

    let item = _.get(this._state, 'item');
    if (item) {
      _.defaults(item, {
        namespace: Database.NAMESPACE.LOCAL,
        id: this._idGenerator.createId()
      });

      items.unshift(item);
    }

    return items;
  }
}

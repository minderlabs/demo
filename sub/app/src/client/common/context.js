//
// Copyright 2017 Minder Labs.
//

/**
 * App context.
 */
export class ContextManager {

  // TODO(burdon): Write to user store on modify (and remove from injector).
  // TODO(burdon): Tasks for contact (create and link to contact).
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
    // TODO(burdon): Remove context if in results (and move matching item to top).

    let item = _.get(this._state, 'item');
    if (item) {
      item.id = this._idGenerator.createId();
      items.unshift(item);
    }

    return items;
  }
}

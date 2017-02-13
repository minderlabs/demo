//
// Copyright 2017 Minder Labs.
//

import { QueryProcessor } from 'minder-core';

/**
 * Test store.
 */
export class TestQueryProcessor extends QueryProcessor {

  static NAMESPACE = 'testing';

  // TODO(burdon): Test items (from randomizer).
  static ITEMS = [
    {
      namespace: TestQueryProcessor.NAMESPACE,
      id: 'T-1',
      type: 'Contact',
      title: 'The Batman'
    }
  ];

  constructor(idGenerator, matcher) {
    super(idGenerator, matcher);
  }

  //
  // QueryProcessor API.
  //

  get namespace() {
    return TestQueryProcessor.NAMESPACE;
  }

  queryItems(context, root, filter={}, offset=0, count=10) {
    return Promise.resolve(TestQueryProcessor.ITEMS);
  }
}

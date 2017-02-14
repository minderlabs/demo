//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { ID, QueryProcessor } from 'minder-core';

/**
 * Test store.
 */
export class TestQueryProcessor extends QueryProcessor {

  // TODO(burdon): Use memjs (to share data with scheduler).

  static NAMESPACE = 'testing';

  // TODO(burdon): Test items (from randomizer).
  static ITEMS = [
    {
      namespace: TestQueryProcessor.NAMESPACE,
      type: 'Contact',
      id: 'T-1',
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
    let items = _.map(TestQueryProcessor.ITEMS, item => _.assign({}, item, {
      modified: ID.timestamp()
    }));

    return Promise.resolve(items);
  }
}

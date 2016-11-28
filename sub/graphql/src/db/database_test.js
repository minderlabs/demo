//
// Copyright 2016 Minder Labs.
//

'use strict';

import { MemoryDatabase } from './memory_database';

//
// Database.
// TODO(burdon): Test both databases.
//

describe('Database:', () => {
  let database = new MemoryDatabase();

  it('Create and get items', () => {
    let context = {};

    let items = database.upsertItems(context, [{ type: 'User', title: 'Minder' }]);
    expect(items.length).to.equal(1);

    let result_items = database.getItems(context, 'User', [items[0].id]);
    expect(result_items[0].title).to.equal(items[0].title);
  });
});

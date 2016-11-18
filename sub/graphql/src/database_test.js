//
// Copyright 2016 Minder Labs.
//

'use strict';

import { Database } from './database';

//
// Database.
//

describe('Database', () => {
  let database = new Database();

  it('Create and get items', () => {
    let items = database.upsertItems([{ type: 'User', title: 'Minder' }]);
    expect(items.length).to.equal(1);

    let item = database.getItem('User', items[0].id);
    expect(item.title).to.equal(items[0].title);
  });
});

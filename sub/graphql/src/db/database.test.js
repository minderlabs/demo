//
// Copyright 2016 Minder Labs.
//

'use strict';

// TODO(burdon): Not running karma/webpack.
const expect = require('chai').expect;

import * as fakeredis from 'fakeredis';

import { MemoryDatabase } from './memory_database';
import { RedisDatabase } from './redis_database';

//
// Database.
// TODO(burdon): Test both databases.
//

const tests = (database) => {

  it('Create and get items.', () => {
    let context = {};

    // TODO(burdon): Test ID.
    let items = database.upsertItems(context, [{ type: 'User', title: 'Minder' }]);
    expect(items).to.exist;
    expect(items.length).to.equal(1);

    let result_items = database.getItems(context, 'User', [items[0].id]);
    expect(result_items).to.exist;
    expect(result_items[0].title).to.equal(items[0].title);
  });
};

describe('MemoryDatabase:',
  () => tests(new MemoryDatabase()));

// https://github.com/hdachev/fakeredis
// describe('RedisDatabase:',
//   () => tests(new RedisDatabase(fakeredis.createClient())));

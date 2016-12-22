//
// Copyright 2016 Minder Labs.
//

// TODO(burdon): Not running karma/webpack.
const expect = require('chai').expect;

import * as fakeredis from 'fakeredis';

import { IdGenerator, Matcher, MemoryItemStore } from 'minder-core';

import { Database } from './database';
import { RedisItemStore } from './redis_item_store';

const matcher = new Matcher();

//
// Database.
// TODO(burdon): Test both databases.
//

const tests = (itemStore) => {

  let database = new Database(matcher).registerItemStore(Database.DEFAULT, itemStore);

  it('Create and get items.', (done) => {
    let context = {};

    // TODO(burdon): Test ID.
    database.upsertItems(context, [{ type: 'User', title: 'Minder' }]).then(items => {
      expect(items).to.exist;
      expect(items.length).to.equal(1);

      database.getItems(context, 'User', [items[0].id]).then(items => {
        expect(items).to.exist;
        expect(items[0].title).to.equal('Minder');

        done();
      });
    });
  });
};

const idGenerator = new IdGenerator(1000);

describe('MemoryDatabase:',
  () => tests(new MemoryItemStore(idGenerator, matcher)));

// https://github.com/hdachev/fakeredis
/*
describe('RedisDatabase:',
  () => tests(new RedisItemStore(fakeredis.createClient(), matcher)));
*/

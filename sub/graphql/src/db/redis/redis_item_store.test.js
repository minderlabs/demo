//
// Copyright 2017 Minder Labs.
//

import bluebird from 'bluebird';
import fakeredis from 'fakeredis';

const expect = require('chai').expect;

import { IdGenerator, Matcher } from 'minder-core';

import { RedisItemStore } from './redis_item_store';

// https://github.com/NodeRedis/node_redis#promises
bluebird.promisifyAll(fakeredis.RedisClient.prototype);
bluebird.promisifyAll(fakeredis.Multi.prototype);

describe('RedisItemStore:', () => {

  let idGenerator = new IdGenerator();
  let matcher = new Matcher();
  let client = fakeredis.createClient('test');
  let store = new RedisItemStore(idGenerator, matcher, 'test', client);

  let context = {
    groupId: 'minderlabs',
    userId: 'tester'
  };

  it('Stores and retrieves items.', (done) => {
    store.clear();

    store.upsertItem(context, {
      type: 'Test',
      title: 'Test 1'
    }).then(item => {
      store.getItem(context, item.type, item.id).then(result => {
        expect(result).to.eql(item);
        done();
      });
    });
  });

  it('Queries items.', (done) => {
    store.clear();

    let items = [
      {
        type: 'Test',
        title: 'Test 1'
      },
      {
        type: 'Test',
        title: 'Test 2'
      },
      {
        type: 'Test',
        title: 'Test 3',
        labels: [
          'red'
        ]
      }
    ];

    let test1 = store.upsertItems(context, items).then(items => {
      let filter = {
        type: 'Test'
      };

      return store.queryItems(context, {}, filter).then(items => {
        expect(items).to.have.lengthOf(items.length);
      });
    });

    let test2 = store.upsertItems(context, items).then(items => {
      let filter = {
        type: 'Test',
        labels: ['red']
      };

      return store.queryItems(context, {}, filter).then(items => {
        expect(items).to.have.lengthOf(1);
      });
    });

    Promise.all([
      test1,
      test2
    ]).then(() => done());
  });
});

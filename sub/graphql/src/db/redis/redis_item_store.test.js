//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import fakeredis from 'fakeredis';

const expect = require('chai').expect;

import { IdGenerator, Matcher } from 'minder-core';

import { RedisItemStore } from './redis_item_store';

describe('Key:', () => {

  it('Stores and retrieves items.', (done) => {
    let idGenerator = new IdGenerator();
    let matcher = new Matcher();
    let client = fakeredis.createClient('test');
    let store = new RedisItemStore(idGenerator, matcher, 'test', client);

    store.clear();
    done();
  });
});

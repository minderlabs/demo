//
// Copyright 2017 Minder Labs.
//

import { expect } from 'chai';

import bluebird from 'bluebird';
import fakeredis from 'fakeredis';

import { IdGenerator, Matcher, ItemStoreTests } from 'minder-core';

import { RedisItemStore } from './redis_item_store';

// https://github.com/NodeRedis/node_redis#promises
bluebird.promisifyAll(fakeredis.RedisClient.prototype);
bluebird.promisifyAll(fakeredis.Multi.prototype);

const idGenerator = new IdGenerator(1000);
const matcher = new Matcher();

const client = fakeredis.createClient('test');

/*
describe('RedisItemStore:', () => {
  ItemStoreTests(expect, () => {
    return Promise.resolve(new RedisItemStore(idGenerator, matcher, client, 'testing'));
  });
});
*/
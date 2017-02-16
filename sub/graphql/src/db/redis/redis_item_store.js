//
// Copyright 2016 Minder Labs.
//

import bluebird from 'bluebird';
import redis from 'redis';

import { ItemStore, Key } from 'minder-core';

// TODO(burdon): Promises
// https://github.com/NodeRedis/node_redis#promises
bluebird.promisifyAll(redis.RedisClient.prototype);

/**
 * Redis Item Store.
 *
 * Items are stored as JSON serialized strings by Key.
 *
 * https://github.com/NodeRedis/node_redis
 * https://redis.io/commands
 */
export class RedisItemStore extends ItemStore {

  // TODO(burdon): PubSub.

  // https://github.com/NodeRedis/node_redis#rediscreateclient
  static client(options) {
    let { db } = options;
    return redis.createClient({
      db
    });
  }

  static ITEM_KEY = new Key('I:{{bucketId}}:{{type}}:{{itemId}}');

  constructor(idGenerator, matcher, namespace, client) {
    super(idGenerator, matcher, namespace);
    console.assert(client);
    this._client = client;
  }

  clear() {
    this._client.flushdb();
  }

  //
  // ItemStore interface.
  //

  upsertItems(context, items) {
    throw new Error('Not implemented');
  }

  getItems(context, type, itemIds) {
    throw new Error('Not implemented');
  }

  //
  // QueryProcessor interface.
  //

  queryItems(context, root, filter={}, offset=0, count=10) {
    // Get all keys.
    let items = this._client.keys(RedisItemStore.ITEM_KEY.toKey());

    throw new Error('Not implemented');
  }
}

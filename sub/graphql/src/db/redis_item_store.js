//
// Copyright 2016 Minder Labs.
//

import 'redis';

import { ItemStore } from 'minder-core';

import { Key } from '../util/key';

/**
 * Redis ItemStore.
 *
 * https://github.com/NodeRedis/node_redis
 */
export class RedisItemStore extends ItemStore {

  // https://github.com/NodeRedis/node_redis#rediscreateclient
  static client(options) {
    return redis.createClient({
      db: options.db
    });
  }

  // TODO(burdon): Promises
  // https://github.com/NodeRedis/node_redis#promises

  // TODO(burdon): Testing.
  // https://github.com/hdachev/fakeredis

  static DB = 10;

  static ITEM_KEY = new Key('I:{{type}}:{{itemId}}');

  constructor(idGenerator, matcher, namespace, client) {
    super(idGenerator, matcher, namespace);
    console.assert(client);

    this._client = client;
    this._client.on('error', (err) => {
      console.log('Error: ' + err);
    });
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
    throw new Error('Not implemented');
  }
}

//
// Copyright 2016 Minder Labs.
//

'use strict';

import 'redis';

import { Database } from './database';

import { Key } from '../util/key';

/**
 * Redis database.
 *
 * https://github.com/NodeRedis/node_redis
 */
export class RedisDatabase extends Database {

  // TODO(burdon): Promises
  // https://github.com/NodeRedis/node_redis#promises

  static ITEM_KEY = new Key('I:{{type}}:{{itemId}}');

  constructor(options) {
    super();

    // https://github.com/NodeRedis/node_redis#rediscreateclient
    this._client = redis.createClient({
      db: options.db
    });

    this._client.on('error', (err) => {
      console.log('Error: ' + err);
    });
  }

  upsertItems(context, items) {




    this.handleMutation(context, items);
  }

  getItems(context, type, itemIds) {

  }

  queryItems(context, filter={}, offset=0, count=10) {

  }
}

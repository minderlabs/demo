//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import bluebird from 'bluebird';
import redis from 'redis';

import { ItemStore, Key } from 'minder-core';

// https://github.com/NodeRedis/node_redis#promises
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

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
    return Promise.resolve(_.map(items, item => {
      let { groupId:bucketId } = context;

      this._onUpdate(item);

      let { type, id:itemId } = item;
      let key = RedisItemStore.ITEM_KEY.toKey({
        bucketId, type, itemId
      });

      this._client.set(key, JSON.stringify(item));

      return item;
    }));
  }

  getItems(context, type, itemIds) {
    let { groupId:bucketId } = context;
    let keys = _.map(itemIds, itemId => RedisItemStore.ITEM_KEY.toKey({
      bucketId,
      type,
      itemId
    }));

    return this._client.mgetAsync(keys).then(items => _.map(items, item => {
      return JSON.parse(item);
    }));
  }

  //
  // QueryProcessor interface.
  //

  queryItems(context, root, filter={}, offset=0, count=10) {
    let { groupId, userId } = context;

    return Promise.all([
      // Group keys.
      this._client.keysAsync(RedisItemStore.ITEM_KEY.toKey({ bucketId: groupId })),

      // User keys.
      this._client.keysAsync(RedisItemStore.ITEM_KEY.toKey({ bucketId: userId }))
    ]).then(sets => {
      let keys = _.flatten(_.concat(sets));

      return this._client.mgetAsync(keys).then(items => {
        return _.filter(_.map(items, item => JSON.parse(item)), item => {
          return this._matcher.matchItem(context, root, filter, item);
        });
      });
    });
  }
}

//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import bluebird from 'bluebird';
import redis from 'redis';

import { ItemStore, Key, Matcher } from 'minder-core';

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

  // TODO(burdon): PubSub demo (and Mutation Processor).

  // https://github.com/NodeRedis/node_redis#rediscreateclient
  static client(options) {
    let { db } = options;
    return redis.createClient({
      db
    });
  }

  // TODO(burdon): Namespace? Or in other data store?
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

  queryItems(context, root, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    let { groupId, userId } = context;

    // Get all keys.
    // TODO(burdon): Eventually get keys from Elasticsearch.
    return Promise.all([

      // Group keys.
      // TODO(burdon): Multiple groups.
      this._client.keysAsync(RedisItemStore.ITEM_KEY.toKey({ bucketId: groupId })),

      // User keys.
      this._client.keysAsync(RedisItemStore.ITEM_KEY.toKey({ bucketId: userId }))

    ]).then(sets => {
      let keys = _.flatten(_.concat(sets));

      // Get all items.
      return this._client.mgetAsync(keys).then(items => {

        // Filter.
        items = _.filter(_.map(items, item => JSON.parse(item)), item => {
          return this._matcher.matchItem(context, root, filter, item);
        });

        // Sort.
        items = Matcher.sortItems(items, filter);

        // Page.
        items = _.slice(items, offset, offset + count);

        return items;
      });
    });
  }
}

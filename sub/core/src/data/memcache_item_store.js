//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { ItemStore } from './item_store';

/**
 * Memcache store.
 * Allows testing across containers (e.g., app-server, scheduler).
 */
export class MemcacheItemStore extends ItemStore {

  static logError(error, reject) {
    console.error('Memcache: %s:%s', error.syscall, error.code);
    reject();
  }

  constructor(idGenerator, matcher, memcache, namespace) {
    super(idGenerator, matcher, namespace);
    console.assert(memcache);

    // https://github.com/alevy/memjs
    // http://amitlevy.com/projects/memjs/#section-5
    // NOTE: Stores {key x value}
    this._memcache = memcache;
  }

  /**
   * Each item is stored with it's namespace prefix.
   * The naked namespace key is used to store a JSON array of item IDs (without the namespace).
   * @param id
   * @return {string}
   */
  key(id) {
    return this._namespace + '/' + id;
  }

  clear() {
    return new Promise((resolve, reject) => {
      this._memcache.flush((error, results) => {
        if (error) { return MemcacheItemStore.logError(error, reject); }

        console.log('Flushed memcache: ' + JSON.stringify(results));
        resolve();
      });
    });
  }

  //
  // Promise wrappers.
  //

  _getItem(itemId) {
    return new Promise((resolve, reject) => {
      this._memcache.get(this.key(itemId), (error, buffer) => {
        if (error) { return MemcacheItemStore.logError(error, reject); }

        let item = JSON.parse(buffer.toString());
        if (item) {
          // TODO(burdon): Handle namespace outside of store?
          _.defaults(item, {
            namespace: this._namespace
          });
        }

        resolve(item);
      });
    });
  }

  _setItem(item) {
    return new Promise((resolve, reject) => {
      this._memcache.set(this.key(item.id), JSON.stringify(item), (error, success) => {
       if (error) { return MemcacheItemStore.logError(error, reject); }
        resolve(item);
      });
    });
  }

  _getItems() {
    return new Promise((resolve, reject) => {
      this._memcache.get(this._namespace, (error, buffer) => {
        if (error) { return MemcacheItemStore.logError(error, reject); }

        // TODO(burdon): Buffer.
        let itemIds = buffer ? JSON.parse(buffer.toString()) : [];
        let promises = _.map(itemIds, itemId => this._getItem(itemId));
        Promise.all(promises).then(items => {
          resolve(items);
        });
      });
    });
  }

  _addItemIds(itemIds) {
    return new Promise((resolve, reject) => {
      this._memcache.get(this._namespace, (error, buffer) => {
        if (error) { return MemcacheItemStore.logError(error, reject); }

        if (buffer) {
          itemIds = _.concat(JSON.parse(buffer.toString()), itemIds);
        }

        // NOTE: This doesn't happen atomically, so could lose data.
        this._memcache.set(this._namespace, JSON.stringify(itemIds), (error, success) => {
          if (error) { return MemcacheItemStore.logError(error, reject); }
          resolve(itemIds);
        });
      });
    });
  }

  //
  // ItemStore interface.
  //

  upsertItems(context, items) {
    console.assert(context && items);

    // Write items.
    let promises = _.map(items, item => {
      console.assert(item.type);

      // TODO(burdon): Factor out to MutationProcessor (then remove idGenerator requirement).
      if (!item.id) {
        item.id = this._idGenerator.createId();
        item.created = moment().unix();
      }

      item.modified = moment().unix();

      // TODO(burdon): Enforce immutable properties (e.g., type).
      return this._setItem(item);
    });

    // Write keys.
    return Promise.all(promises).then(items => {
      return this._addItemIds(_.map(items, item => item.id)).then(() => items);
    });
  }

  getItems(context, type, itemIds) {
    console.assert(context && type && itemIds);

    // Read items.
    let promises = _.map(itemIds, itemId => {
      return this._getItem(itemId);
    });

    return Promise.all(promises).then(items => _.compact(items));
  }

  //
  // QueryProcessor interface.
  //

  queryItems(context, root, filter={}, offset=0, count=10) {
    console.assert(context && filter);

    // Get all items.
    return this._getItems(items => {
      let matching = _.filter(items, item => this._matcher.matchItem(context, root, filter, item));

      // Sort.
      let orderBy = filter.orderBy;
      if (orderBy) {
        console.assert(orderBy.field);
        matching = _.orderBy(matching, [orderBy.field], [orderBy.order === 'DESC' ? 'desc' : 'asc']);
      }

      // Page.
      return _.slice(matching, offset, offset + count);
    });
  }
}

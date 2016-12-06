//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { IdGenerator, ItemStore, TypeUtil } from 'minder-core';

// FIXME move to separate file
export class AclManager {

  _isIn(userId, acl) {
    // TODO(madadam): When acl is an Acl, pass list [Group] and fan out.
    /*
    return _.reduce(
      _.map(groups, group => { return _isInGroup(userId, group); }),
      (trueSoFar, next) => {
        return trueSoFar && next;
      }
    );
    */
    return _isInGroup(userId, acl);
  }

  _isInGroup(userId, group) {
    return userId in _.map(group.members, 'id');
  }

  /**
   *
   * @param userId
   * @param item
   * @returns Item or null.
   */
  canRead(userId, item) {
    console.log('** canRead ' + JSON.stringify(item)); // FIXME
    if (!item.acl) {
      // Permissive by default.
      return item;
    }
    if (!userId) {
      return null;
    }
    // TODO(madadam): When Acl.readers is a list of Groups, change this to
    //return this._isIn(userId, acl.readers);
    return this._isIn(userId, item.acl) ? item : null;
  }
}

// FIXME singleton
const aclManager = new AclManager();


/**
 * Base database implementation.
 */
export class Database extends ItemStore {

  // TODO(burdon): Logger.

  static DEFAULT = '*';

  // TODO(burdon): Inject.
  static IdGenerator = new IdGenerator(1000);

  constructor(matcher) {
    super(matcher);

    // ItemStores.
    // TODO(burdon): Should be by domain?
    this._stores = new Map();

    // Callback.
    this._onMutation = null;
  }

  /**
   * Register fan-out stores.
   *
   * @param type
   * @param store
   * @returns {Database}
   */
  registerItemStore(type, store) {
    console.assert(type && store);
    this._stores.set(type, store);
    return this;
  }

  getItemStore(type) {
    return this._stores.get(type) || this._stores.get(Database.DEFAULT);
  }

  // TODO(burdon): Evolve into mutation dispatcher to QueryRegistry.
  onMutation(callback) {
    this._onMutation = callback;
    return this;
  }

  handleMutation(context, items) {
    this._onMutation && this._onMutation(context, items);
  }

  //
  // Helper methods.
  //

  getItem(context, type, itemId) {
    return this.getItems(context, type, [itemId]).then(items => items[0]);
  }

  upsertItem(context, item) {
    return this.upsertItems(context, [item]).then(items => items[0]);
  }

  //
  // ItemStore API.
  //

  /**
   * @returns {Promise}
   */
  upsertItems(context, items) {
    console.log('DB.UPSERT: %s', TypeUtil.JSON(items));

    // TODO(burdon): Dispatch to store (check permissions).
    let itemStore = this.getItemStore(Database.DEFAULT);
    return Promise.resolve(itemStore.upsertItems(context, items)).then(modifiedItems => {

      // Invalidate clients.
      this.handleMutation(context, modifiedItems);

      return modifiedItems;
    });
  }

  /**
   * @returns {Promise}
   */
  getItems(context, type, itemIds) {
    console.log('DB.GET[%s]: [%s]', type, itemIds);

    let itemStore = this.getItemStore(type);
    return Promise.resolve(itemStore.getItems(context, type, itemIds)).then(items => {
      if (!_.compact(items).length) {
        console.warn('Invalid result: %s' % items);
      }

      return items;
    });
  }

  /**
   * @returns {Promise}
   */
  queryItems(context, filter={}, offset=0, count=10) {
    console.log('DB.QUERY[%d:%d]: %s', offset, count, JSON.stringify(filter));

    let itemStore = this.getItemStore(filter.type);

    // This is annoying, should just let graph resolver system handle resolving Acl groups,
    // but can't figure out how to filter after all resolution. Where would that go?
    // Also, then the requester would have to add acl fragments... dicey for security.
    // Might be secure if the default is reject for all Acl types, so if an Acl fragment isn't included
    // the response will be empty.
    //
    // Instead, run a functional chain to resolve acl group membership, and then filter.
    return Promise.resolve(itemStore.queryItems(context, filter, offset, count))
      .then(items => {
        return _.compact(_.map(items, item => {
          let userId = context.user && context.user.userId;
          // FIXME resolve item.acl from a string.
          return item;
          //return aclManager.canRead(userId, item.acl);
        }));
      });
  }
}

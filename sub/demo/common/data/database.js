//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * User item.
 */
export class User {

  constructor(data) {
    this.id = data.id;
    this.title = data.title;
  }
}

/**
 * Data item.
 */
export class Item {

  constructor(data) {
    this.id = data.id;
    this.version = data.version;

    // TODO(burdon): Common.
    this.title = data.title;

    // TODO(burdon): Type-specific.
    this.status = data.status;
  }
}

/**
 * Database abstraction (and in-memory implementation).
 */
export class Database {

  // TODO(burdon): Design API and implement real backend.

  static DEFAULT_USER = 'U-1';

  // TODO(burdon): Factor out.
  static createId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  constructor() {
    this._users = new Map();

    // TODO(burdon): Map of maps per user.
    this._items = new Map();
  }

  init() {
    const data = require('./test.json');

    // Create users.
    for (let user of data['users']) {
      this.createUser(user);
    }

    // Create items for default user.
    let user = this.getUser(Database.DEFAULT_USER);
    for (let item of data['items']) {
      this.createItem(user.id, item);
    }

    return this;
  }

  //
  // Users
  //

  getUser(id) {
    let user = this._users.get(id);
    console.assert(user);
    console.log('USER.GET', id, JSON.stringify(user));
    return user;
  }

  createUser(data) {
    let user = new User(data);
    console.log('USER.CREATE', JSON.stringify(user));
    this._users.set(user.id, user);
    return user;
  }

  //
  // Items
  // NOTE: graph-relay nodeDefinitions enforces GUID for item (i.e., bucket must be encoded in the local ID).
  //

  getItem(itemId) {
    let item = this._items.get(itemId);
    console.log('ITEM.GET', itemId, JSON.stringify(item));
    return item;
  }

  getItems(userId, args) {
    let items = Array.from(this._items.values());
    console.log('ITEM.GET', userId, args, items.length);
    return items;
  }

  createItem(userId, data) {
    if (data.id === undefined) {
      data.id = Database.createId();
    }

    if (data.version === undefined) {
      data.version = 0;
    }

    let item = new Item(data);
    console.log('ITEM.CREATE', userId, JSON.stringify(item));
    this._items.set(item.id, item);
    return item;
  }

  updateItem(itemId, data) {
    console.log('ITEM.UPDATE', data);
    let item = this.getItem(itemId);

    item.version += 1;

    // TODO(burdon): Generalize.
    Database.maybeUpdateItem(item, data, 'title');
    Database.maybeUpdateItem(item, data, 'status');

    return item;
  }

  //
  // Utils.
  // TODO(burdon): Factor out.
  //

  static maybeUpdateItem(item, data, field) {
    if (data[field] !== undefined) {
      item[field] = data[field];
    }
  }
}

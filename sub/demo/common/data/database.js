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

  constructor() {
    this._items = new Map();
    this._users = new Map();
  }

  init() {
    const data = require('./test.json');

    for (let user of data['users']) {
      this.createUser(user);
    }

    for (let item of data['items']) {
      this.createItem(item);
    }

    return this;
  }

  getUser(id=undefined) {
    // TODO(burdon): Alias for current user.
    if (id === undefined) {
      id = 'U-1';
    }

    return this._users.get(id);
  }

  getItem(id) {
    return this._items.get(id);
  }

  getItems() {
    return Array.from(this._items.values());
  }

  query(type) {
    // TODO(burdon): Query.
    switch (type) {

      case 'User': {
        return Array.from(this._users.values());
      }

      case 'Item': {
        // TODO(burdon): Items for user.
        return Array.from(this._items.values());
      }
    }
  }

  createUser(data) {
    console.assert(data.id);

    let user = new User(data);
    this._users.set(user.id, user);
    return user;
  }

  createItem(data) {
    if (!data.id) {
      data.id = String(new Date().getTime());
    }

    if (!data.version) {
      data.version = 0;
    }

    let item = new Item(data);
    this._items.set(item.id, item);
    return item;
  }
}

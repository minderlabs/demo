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
  }
}

/**
 * Data item.
 */
export class Item {

  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.version = data.version;
  }
}

/**
 * Database abstraction.
 */
export class Database {

  // TODO(burdon): Design API and implement real backend.

  constructor() {
    this._items = new Map();
    this._users = new Map();
  }

  init() {
    let user = new User({
      id: 'user_1'
    });

    this._users.set(user.id, user);

    // TODO(burdon): Fix.
    const data = require('./test.json');
    for (let i = 0; i < data['items'].length; i++) {
      this.newItem(data['items'][i]);
    }

    return this;
  }

  getUser(id=undefined) {
    // TODO(burdon): Alias for current user.
    if (id === undefined) {
      id = 'user_1';
    }

    return this._users.get(id);
  }

  getItem(id) {
    return this._items.get(id);
  }

  getItems() {
    // TODO(burdon): Query.
    return Array.from(this._items.values());
  }

  newItem(data) {
    console.log('NEW', data);

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

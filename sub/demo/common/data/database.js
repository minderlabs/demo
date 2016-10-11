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
    this.version = data.version;
    this.status = data.status;
    this.title = data.title;
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

  getViewer() {
    return this.getUser('user_1');
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

  newItem(data) {
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

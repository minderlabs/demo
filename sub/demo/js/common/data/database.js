//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import { Util } from '../util/util';

/**
 * User.
 */
export class User {

  static KIND = 'User';

  constructor(values) {
    console.assert(values.id);

    this.id = values.id;
    this.title = values.title;
  }
}

/**
 * Item.
 */
export class Item {

  static KIND = 'Item';

  static typeRegistry = new Map();

  constructor(values) {
    console.assert(values.id);
    console.assert(values.type);

    this.id = values.id;
    this.type = values.type;
    this.version = values.version || 0;

    this.data = {
      type: values.type
    };

    this.update(values);
  }

  get handler() {
    console.assert(this.type);
    return Item.typeRegistry.get(this.type);
  }

  // TODO(burdon): Dispatch to base types.

  update(values) {
    Util.maybeUpdateItem(this, values, 'title');
    Util.updateStringSet(this, values, 'labels');

    this.handler.update(this.data, values['data'] || {})
  }

  match(text) {
    // TODO(burdon): If not debugging then show nothing unless matches something.
    return !text || Util.textMatch(this, ['title'], text) || this.handler.match(this.data, text);
  }

  snippet(queryString) {
    if (queryString) {
      let snippets = Util.computeSnippet(this, ['title'], queryString);
      snippets = [...snippets, this.handler.snippet(this.data, queryString)];
      if (snippets) {
        return _.join(snippets, ',');
      }
    }
  }
}

//
// Types
//

class BaseTypeHandler {

  update(item, data) {}

  match(item, text) {}

  snippet(item, queryString) {}
}

class TaskTypeHandler extends BaseTypeHandler {

  update(data, values) {
    Util.maybeUpdateItem(data, values, 'priority');
  }

  match(data, text) {
    return Util.textMatch(data, ['title'], text);
  }

  snippet(data, queryString) {}
}

class NoteTypeHandler extends BaseTypeHandler {

  update(data, values) {
    Util.maybeUpdateItem(data, values, 'content');
  }

  match(data, text) {
    return Util.textMatch(data, ['title', 'content'], text);
  }

  snippet(data, queryString) {
    return Util.computeSnippet(data, ['content'], queryString);
  }
}

Item.typeRegistry.set('Task', new TaskTypeHandler());
Item.typeRegistry.set('Note', new NoteTypeHandler());

/**
 * Database abstraction (and in-memory implementation).
 */
export class Database {

  static singleton = null;

  constructor() {
    this._users = new Map();

    // TODO(burdon): Map by user.
    this._items = new Map();
  }

  init() {
    const data = require('./testing/test.json');

    // Create users.
    for (let user of data['users']) {
      this.createUser(user);
    }

    // Create items for users.
    _.each(data['items'], (types, userId) => {
      let user = this.getUser(userId);

      _.each(types, (items, type) => {
        for (let item of items) {
          this.createItem(user.id, type, item);
        }
      });
    });

    return this;
  }

  searchItems(userId, text) {
    console.log('SEARCH["%s"]', text);

    // TODO(burdon): Items by user.
    let items = [... this._items.values()].filter((item) => {
      return item.match(text);
    });

    return items;
  }

  //
  // Private type-specific implementations, not intended to be part of the public Database interface.
  //

  //
  // Users
  //

  getUser(userId) {
    let user = this._users.get(userId);
    console.assert(user);
    console.log('USER.GET', userId, JSON.stringify(user));
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
  //

  getItem(itemId) {
    let item = this._items.get(itemId);
    console.log('ITEM.GET', itemId, JSON.stringify(item));
    return item;
  }

  getItems(userId, args) {
    let items = Array.from(this._items.values());
    console.log('ITEMS.GET', userId, args, items.length);
    return items;
  }

  createItem(userId, type, data) {
    console.assert(userId);
    console.assert(type);

    data.type = type;

    if (data.id === undefined) {
      data.id = Util.createId();
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
    let item = this._items.get(itemId);

    item.update(data);
    item.version += 1;

    console.log('ITEM.UPDATE', JSON.stringify(item));
    return item;
  }
}

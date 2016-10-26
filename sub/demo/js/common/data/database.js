//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import { Util } from '../util/util';

/**
 * Viewer.
 */
export class Viewer {

  static KIND = 'Viewer';

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

  update(values) {
    Util.maybeUpdateItem(this, values, 'title');
    Util.updateStringSet(this, values, 'labels');

    this.handler.update(this.data, values['data'] || {})
  }

  match(text) {
    // TODO(burdon): Default query by label.
    // TODO(burdon): If not debugging then show nothing unless matches something.
    return !text || Util.textMatch(this, ['title'], text) || this.handler.match(this.data, text);
  }

  snippet(queryString) {
    if (queryString) {
      let snippets = Util.computeSnippet(this, ['title'], queryString);
      let dataSnippets = this.handler.snippet(this.data, queryString);
      if (dataSnippets) {
        snippets = snippets.concat(dataSnippets);
      }

      if (snippets) {
        return _.join(snippets, ';');
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
    // Map of users.
    this._users = new Map();

    // Map of all items.
    this._itemIndex = new Map();

    // Map of items by user.
    this._userItems = new Map();
  }

  init() {
    const data = require('./testing/test.json');

    // Create users.
    for (let user of data['users']) {
      this.createUser(user);
    }

    // Create items for users.
    _.each(data['items'], (types, userId) => {
      let user = this.getViewer(userId);

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

    return [... this._itemIndex.values()].filter((item) => {
      return item.match(text);
    });
  }

  //
  // Private type-specific implementations, not intended to be part of the public Database interface.
  //

  //
  // Users
  //

  getViewer(userId) {
    let user = this._users.get(userId);
    console.assert(user);
    console.log('USER.GET', userId, JSON.stringify(user));
    return user;
  }

  createUser(data) {
    let user = new Viewer(data);
    console.log('USER.CREATE', JSON.stringify(user));
    this._users.set(user.id, user);
    return user;
  }

  //
  // Items
  // TODO(burdon): Replace userId with bucketId?
  //

  getUserItemMap(userId) {
    let items = this._userItems.get(userId);
    if (!items) {
      items = new Map();
      this._userItems.set(userId, items);
    }
    return items;
  }

  // TODO(burdon): Enforce bucketId?
  // TODO(burdon): Must check that user has permission to access item (check bucket).
  getItem(itemId) {
    let item = this._itemIndex.get(itemId);
    console.log('ITEM.GET', itemId, JSON.stringify(item));
    return item;
  }

  getItems(userId, type) {
    let items = Array.from(this.getUserItemMap(userId).values());
    console.log('ITEMS.GET', userId, type, items.length);
    return items;
  }

  createItem(userId, type, data) { // TODO(burdon): Rename values.
    console.assert(userId);
    console.assert(type);

    data.id = Util.createItemId(type);
    data.type = type;
    data.version = 0;

    let item = new Item(data); // TODO(burdon): Pass in ID, type separately.
    console.log('ITEM.CREATE', userId, JSON.stringify(item));
    this._itemIndex.set(item.id, item);
    this.getUserItemMap(userId).set(item.id, item);
    return item;
  }

  updateItem(itemId, values) {
    let item = this._itemIndex.get(itemId);

    item.update(values);
    item.version += 1;

    console.log('ITEM.UPDATE', JSON.stringify(item));
    return item;
  }
}

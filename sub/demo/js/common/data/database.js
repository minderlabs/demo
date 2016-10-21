//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import { Util } from '../util/util';

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

  static update(item, data) {
    Util.maybeUpdateItem(item, data, 'title');
    Util.updateStringSet(item, data, 'labels');

    // TODO(burdon): Type-specific.
    Util.maybeUpdateItem(item, data, 'status');
  }

  constructor(data) {
    this.id = data.id;
    this.version = data.version || 0;

    Item.update(this, data);
  }

  computeSnippet(queryString) {
    if (!queryString) {
      return null;
    }
    return `title match [${queryString}]: ${this.title}`;
  }
}

// TODO(burdon): Remove.
export class Note {

  static update(note, data) {
    Util.maybeUpdateItem(note, data, 'title');
    Util.maybeUpdateItem(note, data, 'content');
  }

  constructor(data) {
    this.id = data.id;

    Note.update(this, data);
  }

  computeSnippet(queryString) {
    // TODO(madadam): Generalize / factor out.
    if (!queryString) {
      return null;
    }
    let matchedField;
    let matchedValue;
    if (this.title.indexOf(queryString) !== -1) {
      matchedField = 'title';
      matchedValue = this.title;
    } else if (this.content.indexOf(queryString) !== -1) {
      matchedField = 'content';
      matchedValue = this.content;
    }
    return `${matchedField} match [${queryString}]: ${matchedValue}`;
  }
}

/**
 * Database abstraction (and in-memory implementation).
 */
export class Database {

  // TODO(burdon): Design API and implement real backend.

  static DEFAULT_USER = 'U-1';

  constructor() {
    this._users = new Map();

    // TODO(burdon): Map of maps per user.
    this._items = new Map();

    this._notes = new Map();
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

    for (let note of data['notes']) {
      this.createNote(note);
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
    console.log('ITEM.UPDATE', data);
    let item = this._items.get(itemId);

    item.version += 1;
    Item.update(item, data);

    return item;
  }

  getNote(noteId) {
    let note = this._notes.get(noteId);
    console.log('NOTE.GET', noteId, JSON.stringify(note));
    return note;
  }

  createNote(data) {
    if (data.id === undefined) {
      data.id = Util.createId();
    }

    let note = new Note(data);
    console.log('NOTE.CREATE', JSON.stringify(note));
    this._notes.set(note.id, note);
    return note;
  }

  searchItems(text) {
    console.log('SEARCH', text);

    // TODO(burdon): Generalize for testing.

    let notes = [... this._notes.values()].filter((note) => {
      return note.title.indexOf(text) !== -1 || note.content.indexOf(text) !== -1;
    });

    let items = [... this._items.values()].filter((item) => {
      return item.title.indexOf(text) !== -1;
    });

    return notes.concat(items);
  }
}


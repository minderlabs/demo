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
 * Task item.
 */
export class Task {

  static update(item, data) {
    Util.maybeUpdateItem(item, data, 'title');
    Util.updateStringSet(item, data, 'labels');
  }

  static match(item, text) {
    return Util.textMatch(item, ['title'], text);
  }

  constructor(data) {
    this.id = data.id;
    this.version = data.version || 0;

    Task.update(this, data);
  }

  computeSnippet(queryString) {
    if (!queryString) {
      return null;
    }
    return `title match [${queryString}]: ${this.title}`;
  }
}

/**
 * Note item.
 */
export class Note {

  static update(item, data) {
    Util.maybeUpdateItem(item, data, 'title');
    Util.updateStringSet(item, data, 'labels');

    Util.maybeUpdateItem(item, data, 'content');
  }

  static match(item, text) {
    return Util.textMatch(item, ['title', 'content'], text);
  }

  constructor(data) {
    this.id = data.id;
    this.version = data.version || 0;

    Note.update(this, data);
  }

  computeSnippet(queryString) {
    // TODO(madadam): Generalize and factor out.
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

  static singleton = null;

  static DEFAULT_USER = 'U-1';

  constructor() {
    this._users = new Map();

    // TODO(burdon): Map of types per user.
    this._tasks = new Map();

    this._notes = new Map();
  }

  init() {
    const data = require('./testing/test.json');

    // Create users.
    for (let user of data['users']) {
      this.createUser(user);
    }

    // Create items for default user.
    let user = this.getUser(Database.DEFAULT_USER);
    for (let task of data['tasks']) {
      this.createTask(user.id, task);
    }

    for (let note of data['notes']) {
      this.createNote(note);
    }

    return this;
  }

  //
  // ItemInterface
  //

  getItem(type, id) {
    switch (type) {

      case 'User': {
        return this.getUser(id);
      }

      case 'Task': {
        return this.getTask(id);
      }

      case 'Note': {
        return this.getNote(id);
      }

      default: {
        return null;
      }
    }
  }

  updateItem(type, itemId, data) {
    switch (type) {

      case 'Task': {
        return this.updateTask(itemId, data);
      }

      case 'Note': {
        return this.updateNote(itemId, data);
      }

      default: {
        return null;
      }
    }
  }

  searchItems(text) {
    console.log('SEARCH["%s"]', text);

    let items = [];

    items = items.concat([... this._tasks.values()].filter((item) => {
      return Task.match(item, text);
    }));

    items = items.concat([... this._notes.values()].filter((item) => {
      return Note.match(item, text);
    }));

    return items;
  }

  //
  // Private type-specific implementations, not intended to be part of the public Database interface.
  //

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

  // TODO(burdon): Remove Note/Task from API (get by type).

  //
  // Tasks
  //

  getTask(itemId) {
    let item = this._tasks.get(itemId);
    console.log('TASK.GET', itemId, JSON.stringify(item));
    return item;
  }

  getTasks(userId, args) {
    let items = Array.from(this._tasks.values());
    console.log('TASKS.GET', userId, args, items.length);
    return items;
  }

  createTask(userId, data) {
    if (data.id === undefined) {
      data.id = Util.createId();
    }

    if (data.version === undefined) {
      data.version = 0;
    }

    let item = new Task(data);
    console.log('TASK.CREATE', userId, JSON.stringify(item));
    this._tasks.set(item.id, item);
    return item;
  }

  updateTask(itemId, data) {
    let item = this._tasks.get(itemId);

    Task.update(item, data);
    item.version += 1;

    console.log('TASK.UPDATE', JSON.stringify(item));
    return item;
  }

  //
  // Notes
  //

  getNote(itemId) {
    let item = this._notes.get(itemId);
    console.log('NOTE.GET', itemId, JSON.stringify(item));
    return item;
  }

  createNote(data) {
    if (data.id === undefined) {
      data.id = Util.createId();
    }

    let item = new Note(data);
    console.log('NOTE.CREATE', JSON.stringify(item));
    this._notes.set(item.id, item);
    return item;
  }

  updateNote(itemId, data) {
    let item = this._notes.get(itemId);

    Note.update(item, data);
    item.version += 1;

    console.log('NOTE.UPDATE', JSON.stringify(item));
    return item;
  }
}

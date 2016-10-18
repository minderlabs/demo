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
    Util.maybeUpdateItem(item, data, 'status');
  }

  constructor(data) {
    this.id = data.id;
    this.version = data.version || 0;

    Item.update(this, data);
  }
}

export class Task {
  static update(task, data) {
    Util.maybeUpdateItem(task, data, 'title');
    Util.maybeUpdateItem(task, data, 'content');
  }

  constructor(data) {
    this.id = data.id;

    Task.update(this, data);
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

    this._tasks = new Map();
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

    for (let task of data['tasks']) {
      this.createTask(task);
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

  getTask(taskId) {
    let task = this._tasks.get(taskId);
    console.log('TASK.GET', taskId, JSON.stringify(task));
    return task;
  }

  createTask(data) {
    if (data.id === undefined) {
      data.id = Util.createId();
    }

    let task = new Task(data);
    console.log('TASK.CREATE', JSON.stringify(task));
    this._tasks.set(task.id, task);
    return task;
  }

  search(text) {
    // TODO(madadam): Search items too.
    const values = [... this._tasks.values()];
    let results = values.filter((task) => {
      return task.title.indexOf(text) !== -1 || task.content.indexOf(text) !== -1;
    });
    return results;
  }
}


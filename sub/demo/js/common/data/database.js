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
    Util.maybeUpdateItem(item, data, 'status');
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

export class Note {
  static update(note, data) {
    Util.maybeUpdateItem(note, data, 'title');
    Util.maybeUpdateItem(note, data, 'status');
    Util.maybeUpdateItem(note, data, 'content');
  }

  constructor(data) {
    this.id = data.id;
    this.version = data.version || 0;

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

    // TODO(burdon): Map of types per user.
    this._tasks = new Map();

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
    for (let task of data['tasks']) {
      this.createTask(user.id, task);
    }

    for (let note of data['notes']) {
      this.createNote(note);
    }

    return this;
  }

  // Generic item interface.

  getItem(type, id) {
    switch (type) {

      case 'Task': {
        return this.getTask(id);
      }

      case 'Note': {
        return this.getNote(id);
      }

      case 'User': {
        return this.getUser(id);
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
    console.log('SEARCH', text);

    // TODO(burdon): Generalize for testing.

    let notes = [... this._notes.values()].filter((note) => {
      return note.title.indexOf(text) !== -1 || note.content.indexOf(text) !== -1;
    });

    let tasks = [... this._tasks.values()].filter((task) => {
      return task.title.indexOf(text) !== -1;
    });

    return notes.concat(tasks);
  }

  //
  // Private type-specific implementations, not intended to be part of the public Database interface.
  //

  // Users

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
  // Tasks
  // NOTE: graph-relay nodeDefinitions enforces GUID for item (i.e., bucket must be encoded in the local ID).
  //

  getTask(taskId) {
    let task = this._tasks.get(taskId);
    console.log('TASK.GET', taskId, JSON.stringify(task));
    return task;
  }

  getTasks(userId, args) {
    let tasks = Array.from(this._tasks.values());
    console.log('TASKS.GET', userId, args, tasks.length);
    return tasks;
  }

  createTask(userId, data) {
    if (data.id === undefined) {
      data.id = Util.createId();
    }

    if (data.version === undefined) {
      data.version = 0;
    }

    let task = new Task(data);
    console.log('TASK.CREATE', userId, JSON.stringify(task));
    this._tasks.set(task.id, task);
    return task;
  }

  updateTask(taskId, data) {
    console.log('ITEM.UPDATE', data);
    let task = this._tasks.get(taskId);

    task.version += 1;
    Task.update(task, data);

    return task;
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

  updateNote(noteId, data) {
    console.log('NOTE.UPDATE', data);
    let note = this._notes.get(noteId);

    note.version += 1;
    Note.update(note, data);

    return note;
  }

}


//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Random from 'random-seed';

import { Util } from '../util/util';

// TODO(burdon): Buckets
// STRAT 1: all items in team (global) bucket (as now). Filter by context (owner/assignee).
// STRAT 2: buckets with denormalized copies (GOOD).
// STRAT 3: move to public bucket and merge personal and shared buckets (BAD).

/**
 * Viewer.
 */
export class Viewer {

  // NOTE: This is more than a User; e.g., might contain runtime state for logged in user.

  // TODO(burdon): Remove.
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

  // TODO(burdon): Remove.
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
    return Item.typeRegistry.get(this.type);
  }

  update(values) {
    Util.maybeUpdateItem(this, values, 'title');
    Util.updateStringSet(this, values, 'labels');

    this.handler && this.handler.update(this.data, values['data'] || {})
  }

  match(text) {
    text = text.trim();

    let match = false;
    if (text) {
      match |= Util.textMatch(this, ['title'], text) || (this.handler && this.handler.match(this.data, text));
    }

    return match;
  }

  snippet(text) {
    if (text) {
      let snippets = Util.computeSnippet(this, ['title'], text);
      let dataSnippets = this.handler && this.handler.snippet(this.data, text);
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

  snippet(item, text) {}
}

class GroupTypeHandler extends BaseTypeHandler {

  update(data, values) {
    Util.maybeUpdateItem(data, values, 'members');
  }
}

class FolderTypeHandler extends BaseTypeHandler {

  update(data, values) {
    Util.maybeUpdateItem(data, values, 'itemId');
    Util.maybeUpdateItem(data, values, 'path');
    Util.maybeUpdateItem(data, values, 'filter');
  }
}

class TaskTypeHandler extends BaseTypeHandler {

  update(data, values) {
    Util.maybeUpdateItem(data, values, 'priority');
    Util.maybeUpdateItem(data, values, 'owner');
    Util.maybeUpdateItem(data, values, 'assignee');
    Util.maybeUpdateItem(data, values, 'details');
  }

  match(data, text) {
    return Util.textMatch(data, ['title'], text);
  }

  snippet(data, text) {}
}

class NoteTypeHandler extends BaseTypeHandler {

  update(data, values) {
    Util.maybeUpdateItem(data, values, 'content');
  }

  match(data, text) {
    return Util.textMatch(data, ['title', 'content'], text);
  }

  snippet(data, text) {
    return Util.computeSnippet(data, ['content'], text);
  }
}

Item.typeRegistry.set('Group',  new GroupTypeHandler());
Item.typeRegistry.set('Folder', new FolderTypeHandler());
Item.typeRegistry.set('Task',   new TaskTypeHandler());
Item.typeRegistry.set('Note',   new NoteTypeHandler());

/**
 * Seedable ID generator.
 * NOTE: Use same seed for in-memory datastore testing. With persistent store MUST NOT be constant.
 */
export class IdGenerator {

  // TODO(burdon): Ensure consistent with server.

  constructor(seed=undefined) {
    this._random = Random.create(seed);
  }

  /**
   * Unique ID compatible with server.
   * @returns {string}
   */
  createId(type) {
    console.assert(type);

    const s4 = () => {
      return Math.floor(this._random.floatBetween(1, 2) * 0x10000)
        .toString(16)
        .substring(1);
    };

    let guid = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

    return `${type}/${guid}`;
  }
}

/**
 * Database abstraction (and in-memory implementation).
 */
export class Database {

  static GLOBAL_BUCKET_ID = '__GLOBAL__';

  static singleton = null;

  constructor() {
    // TODO(burdon): Unset seed if persistent.
    this._idGenerator = new IdGenerator(0);

    // Map of users.
    this._users = new Map();

    // Map of all items.
    this._items = new Map();

    // Map of items by user.
    this._userItems = new Map();

    // Callback on mutation.
    this._mutationHandler = null;
  }

  onMutation(handler) {
    this._mutationHandler = handler;
  }

  init() {
    const data = require('./testing/test.json');

    // Create users.
    for (let user of data['User']) {
      this.createUser(user);
      this.createItem(Database.GLOBAL_BUCKET_ID, 'User', _.defaults(user, {
        type: 'User'
      }));
    }

    // Create groups.
    for (let group of data['Group']) {
      this.createItem(Database.GLOBAL_BUCKET_ID, 'Group', _.defaults(group, {
        type: 'Group'
      }));
    }

    // Create items within user buckets.
    _.each(data['items'], (types, bucketId) => {
      _.each(types, (items, type) => {
        for (let item of items) {
          this.createItem(bucketId, type, item);
        }
      });
    });

    return this;
  }

  //
  // Private type-specific implementations, not intended to be part of the public Database interface.
  //

  //
  // Users
  //

  getViewer(userId) {
    return this.getUser(userId);
  }

  getUser(userId) {
    let user = this._users.get(userId);
    console.assert(user);
    console.log('USER.GET', userId, JSON.stringify(user));
    return user;
  }

  getUsers() {
    return Array.from(this._users.values());
  }

  createUser(data) {
    let user = new Viewer(data);
    console.log('USER.CREATE', JSON.stringify(user));
    this._users.set(user.id, user);
    return user;
  }

  //
  // Folders
  //

  getFolders() {
    return this.getItems(Database.GLOBAL_BUCKET_ID, { type: "Folder" });
  }

  //
  // Items
  // TODO(burdon): Replace userId with bucketId?
  //

  getItemMap(bucketId) {
    let items = this._userItems.get(bucketId);
    if (!items) {
      items = new Map();
      this._userItems.set(bucketId, items);
    }
    return items;
  }

  // TODO(burdon): Enforce bucketId? Schema can't pass this?
  // TODO(burdon): Must check that user has permission to access item (check bucket).
  getItem(itemId) {
    let item = this._items.get(itemId);
    console.log('ITEM.GET[%s] = %s', itemId, JSON.stringify(item));
    return item;
  }

  getItemsById(itemIds) {
    return _.map(itemIds, (itemId) => {
      return this.getItem(itemId);
    });
  }

  getItems(bucketId, filter=null) {
    // TODO(burdon): By bucket.
//  let items = Array.from(this.getItemMap(bucketId).values());
    if (!filter) {
      filter = {};
    }

    // TODO(burdon): Factor out filters.
    let items = _.filter(Array.from(this._items.values()), (item) => {
      // Must match something.
      let match = false;

      if (filter.type) {
        match = (item.type === filter.type);
        if (!match) {
          return false;
        }
      }

      // AND type.
      switch (item.type) {
        // TODO(burdon): Hack to match by owner/assigned (how would indexing work?)
        case 'Task': {
          if (bucketId !== item.data.owner && bucketId !== item.data.assignee) {
            return false;
          }
          break;
        }
      }

      // AND (OR labels).
      if (filter.labels) {
        match = false;
        _.each(item.labels || [], (label) => {
          if (filter.labels.indexOf(label) != -1) {
            match = true;
            return false;
          }
        });
        if (!match) {
          return false;
        }
      }

      // AND text.
      if (filter.text) {
        match = item.match(filter.text);
        if (!match) {
          return false;
        }
      } else {
        // Fail if must match text.
        if (filter.matchText) {
          return false;
        }
      }

      return match;
    });

    console.log('ITEMS.GET[%s]: %s => %d', bucketId, JSON.stringify(filter), items.length);
    return items;
  }

  createItem(bucketId, type, values) { // TODO(burdon): Rename values.
    console.assert(bucketId);
    console.assert(type);

    values.id = values.id || this._idGenerator.createId(type);
    values.type = type;
    values.version = 0;

    let item = new Item(values); // TODO(burdon): Pass in ID, type separately.
    console.log('ITEM.CREATE[%s] = %s', bucketId, JSON.stringify(item));
    this._items.set(item.id, item);
    this.getItemMap(bucketId).set(item.id, item);

    // Trigger invalidations.
    // TODO(burdon): Need client ID.
    this._mutationHandler && this._mutationHandler(item);

    return item;
  }

  updateItem(itemId, values) {
    let item = this._items.get(itemId);

    item.update(values);
    item.version += 1;

    console.log('ITEM.UPDATE[%s] = %s', JSON.stringify(item));

    // Trigger invalidations.
    // TODO(burdon): Need client ID.
    this._mutationHandler && this._mutationHandler(item);

    return item;
  }
}

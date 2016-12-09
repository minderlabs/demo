//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { MemoryItemStore } from '../memory_item_store';

/**
 * Caches the entire Firebase dataset into a memory item store.
 */
export class Cache {

  static sanitizeKey(key) {
    return key.replace('.', '_');
  }

  constructor(db, root, matcher, parseData) {
    console.assert(db && root && matcher && parseData);

    this._db = db;
    this._root = root;
    this._matcher = matcher;
    this._parseData = parseData;

    // Cache.
    this._itemStore = null;
  }

  /**
   * Reads the firebase dataset into memory.
   */
  updateCache() {
    // Reset.
    this._itemStore = new MemoryItemStore(this._matcher);

    // https://firebase.google.com/docs/database/web/read-and-write#read_data_once
    // https://firebase.google.com/docs/reference/js/firebase.database.Reference#once
    // https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
    return this._db.ref(this._root).orderByKey().once('value').then(data => {
      this._parseData(this._itemStore, data);

      return this._itemStore;
    });
  }

  /**
   * Returns the entire fully populated memory item store.
   * @param forceUpdate Rebuilds the cache if set.
   * @returns {Promise.<MemoryItemStore>}
   */
  getItemStore(forceUpdate=false) {
    return Promise.resolve(this._itemStore && !forceUpdate ? this._itemStore : this.updateCache());
  }
}

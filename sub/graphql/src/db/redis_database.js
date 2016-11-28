//
// Copyright 2016 Minder Labs.
//

'use strict';

import { Database } from './database';

/**
 * Redis database.
 */
export class RedisDatabase extends Database {

  constructor() {
    super();
  }

  upsertItems(context, items) {

  }

  getItems(context, type, itemIds) {

  }

  queryItems(context, filter={}, offset=0, count=10) {

  }
}

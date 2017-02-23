//
// Copyright 2017 Minder Labs.
//

import { MemoryItemStore } from './memory_item_store';
import { IdGenerator } from './id';
import { Matcher } from './matcher';

import { ItemStoreTests } from './item_store_tests';

const idGenerator = new IdGenerator(1000);
const matcher = new Matcher();

describe('MemoryItemStore:', () => {
  ItemStoreTests(() => {
    return Promise.resolve(new MemoryItemStore(idGenerator, matcher));
  });
});

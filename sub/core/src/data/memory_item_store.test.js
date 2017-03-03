//
// Copyright 2017 Minder Labs.
//

import { expect } from 'chai';

import { IdGenerator } from './id';
import { Matcher } from './matcher';
import { MemoryItemStore } from './memory_item_store';

import { ItemStoreTests } from './item_store_tests';

const idGenerator = new IdGenerator(1000);
const matcher = new Matcher();

describe('MemoryItemStore:', () => {
  ItemStoreTests(expect, () => {
    return Promise.resolve(new MemoryItemStore(idGenerator, matcher));
  });
});

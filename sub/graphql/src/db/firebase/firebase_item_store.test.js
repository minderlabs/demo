//
// Copyright 2017 Minder Labs.
//

import { expect } from 'chai';

import path from 'path';
import admin from 'firebase-admin';

import { IdGenerator, Matcher, ItemStoreTests } from 'minder-core';

import { FirebaseItemStore } from './firebase_item_store';

const idGenerator = new IdGenerator(1000);
const matcher = new Matcher();

// TODO(burdon): Use mocks?
// TODO(burdon): Conditionally run BIG tests.

// End-to-end testing.
// https://firebase.googleblog.com/2015/04/end-to-end-testing-with-firebase-server_16.html

export const FirebaseAppConfig = {
  databaseURL: 'https://minder-qa.firebaseio.com',
  credential: admin.credential.cert(path.join(__dirname, 'conf/minder-qa-e90e2fe651a3.json'))
};

const db = admin.initializeApp(FirebaseAppConfig).database();

describe('FirebaseItemStore (buckets):', function() {
  this.timeout(5000);

  ItemStoreTests(expect, () => {
    return new FirebaseItemStore(idGenerator, matcher, db, 'testing', true).clear();
  });
});

describe('FirebaseItemStore (no buckets):', function() {
  this.timeout(5000);

  ItemStoreTests(expect, () => {
    return new FirebaseItemStore(idGenerator, matcher, db, 'testing', false).clear();
  }, false);
});

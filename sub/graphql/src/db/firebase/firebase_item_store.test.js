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

// TODO(burdon): Create testing account.
export const FirebaseAppConfig = {
  databaseURL: 'https://minder-beta.firebaseio.com',
  credential: admin.credential.cert(path.join(__dirname, 'conf/minder-beta-firebase-adminsdk-n6arv.json'))
};

admin.initializeApp(FirebaseAppConfig);

const db = admin.database();

describe('FirebaseItemStore:', function() {
  this.timeout(5000);

  ItemStoreTests(expect, () => {
    return new FirebaseItemStore(idGenerator, matcher, db, 'testing').clear();
  });
});

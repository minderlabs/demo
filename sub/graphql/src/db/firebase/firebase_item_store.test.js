//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import { expect } from 'chai';
import path from 'path';

import admin from 'firebase-admin';

import { IdGenerator, Matcher, ItemStoreTests } from 'minder-core';

import { FirebaseItemStore } from './firebase_item_store';
import { FirebaseTestConfig } from './conf/defs';

const config = _.defaults(FirebaseTestConfig, {
  credential: admin.credential.cert(path.join(__dirname, './conf', FirebaseTestConfig.credentialPath))
});

const db = admin.initializeApp(config).database();

const idGenerator = new IdGenerator(1000);
const matcher = new Matcher();

//
// End-to-end testing.
// https://firebase.googleblog.com/2015/04/end-to-end-testing-with-firebase-server_16.html
//

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

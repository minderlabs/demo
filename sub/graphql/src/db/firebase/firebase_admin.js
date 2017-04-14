//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment'
import path from 'path';

import admin from 'firebase-admin';

import { FirebaseTestConfig } from './conf/defs';

const config = _.defaults(FirebaseTestConfig, {
  credential: admin.credential.cert(path.join(__dirname, './conf', FirebaseTestConfig.credentialPath))
});

const db = admin.initializeApp(config).database();

//
// Data migration.
//

// TODO(burdon): Process command line options.

db.ref('/users').once('value', data => {
  let oldUsers = data.val();

  Promise.all(_.map(oldUsers, (oldUser, id) => {
    let { created, credentials, profile } = oldUser;
    let { email, name:title } = profile;

    if (!created) {
      created = moment().unix();
    }

    let newUser = {
      type: 'User',
      id,
      active: true,
      created,
      credentials,
      title,
      email
    };

    return new Promise((resolve, reject) => {
      let key = '/system/User/' + id;
      console.log(key + ' => ' + JSON.stringify(_.pick(newUser, ['email'])));
      db.ref(key).set(newUser, error => {
        if (error) { reject(); } else { resolve(key); }
      });
    });

  }))
    .then(() => {
      console.log('OK');
      process.exit();
    })
    .catch(error => {
      console.log('ERROR:', error);
      process.exit();
    });
});

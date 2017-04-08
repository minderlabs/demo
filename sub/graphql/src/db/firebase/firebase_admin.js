//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment'

import path from 'path';
import admin from 'firebase-admin';

export const FirebaseAppConfig = {
  databaseURL: 'https://minder-qa.firebaseio.com',
  credential: admin.credential.cert(path.join(__dirname, 'conf/minder-qa-e90e2fe651a3.json'))
};

const db = admin.initializeApp(FirebaseAppConfig).database();

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

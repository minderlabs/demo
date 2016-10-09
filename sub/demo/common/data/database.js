'use strict;'

export class User {}

export class Item {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.version = data.version;
  }
}

export class Database {
  static getUser(id) {
    // FIXME
    //return users.find(u => u.id === id);
    return user;
  }

  static getItem(id) {
    return items.find(i => i.id === id);
  }

  static getItems() {
    return items;
  }

  static newItem(data) {
    if (!data.id) {
      data.id = '' + (items.length + 1);
    }
    if (!data.version) {
      data.version = 0;
    }
    const item = new Item(data);
    items.push(item);
    return item;
  }
}

// Test data.
// TODO(madadam): Real database queries.

const user = new User();
user.id = '1';

const data = require('./test.json');
const items = [];
//const items = data['items'];

(function() {
  let item;
  for (let i = 0; i < data['items'].length; i++) {
    let d = data['items'][i];
    Database.newItem(d);
  }
})();


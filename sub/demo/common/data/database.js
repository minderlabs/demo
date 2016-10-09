'use strict;'

export class User {}
export class Item {}


const user = new User();
user.id = '1';

// Test data.
// TODO(madadam): Real database queries.
const data = require('./test.json');
const items = [];
//const items = data['items'];

(function() {
  let item;
  for (let i = 0; i < data['items'].length; i++) {
    // FIXME wtf
    let d = data['items'][i];
    item = new Item();
    item.id = d.id;
    item.title = d.title;
    item.version = d.version;
    items.push(item);
  }

})();

export class Database {
  static getUser(id) {
    // FIXME
    //return users.find(u => u.id === id);
    return user;
  }

  static getItem(id) {
    console.log('LOOKING FOR ' + id); // FIXME
    return items.find(i => i.id === id);
  }

  static getItems() {
    console.log('ITEMS: ' + JSON.stringify(items)); // FIXME
    return items;
  }
}
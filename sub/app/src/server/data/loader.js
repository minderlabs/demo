//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { Database, ID, TypeUtil } from 'minder-core';
import { Resolvers } from 'minder-graphql';

/**
 * Loads start-up and test data.
 */
export class Loader {

  /**
   * @param database
   * @param testing If true use alias as ID.
   */
  constructor(database, testing=false) {
    console.assert(database);
    this._database = database;
    this._testing = testing;
  }

  /**
   * Parse data file.
   * @param data JSON data file.
   * @param namespace
   */
  parse(data, namespace=Database.NAMESPACE.USER) {
    return this.parseItems(_.get(data, 'Items'), namespace)
      .then(() => this.parseMutations(_.get(data, 'Mutations'), namespace));
  }

  /**
   * Parse item defs.
   */
  parseItems(itemsByType, namespace) {

    // In testing use alias as ID (for test file ID resolution).
    let itemsByAlias = new Map();

    // Iterate each item by type.
    let parsedItems = TypeUtil.flattenArrays(_.map(itemsByType, (items, type) => {

      // Iterate items.
      return _.map(items, (item) => {
        item.type = type;

        // If testing, use alias as ID.
        if (this._testing && item.alias) {
          itemsByAlias.set(item.alias, item);
          item.id = item.alias;
        }

        // TODO(burdon): Factor out special type handling.
        // NOTE: The GraphQL schema defines filter as an input type.
        // In order to "store" the filter within the Folder's filter property, we need
        // to serialize it to a string (otherwise we need to create parallel output type defs).
        switch (type) {

          case 'Project': {
            item.bucket = item.group;
            break;
          }

          case 'Folder': {
            item.filter = JSON.stringify(item.filter);
            break;
          }
        }

        return item;
      });
    }));

    return this._database.getItemStore(namespace).upsertItems({}, parsedItems);
  }

  /**
   * Parse item mutations.
   */
  parseMutations(itemMutations, namespace) {
    if (!itemMutations) {
      return Promise.resolve([]);
    }

    // Translate local IDs to remote IDs.
    TypeUtil.traverse(itemMutations, (value, key, root) => {
      if (key === '@itemId') {
        delete root['@itemId'];
        let { type, id:localId } = value;
        root.itemId = ID.toGlobalId(type, localId);
      }
    });

    let itemStore = this._database.getItemStore(namespace);
    return Resolvers.processMutations(itemStore, {}, itemMutations);
  }

  /**
   * Initialize group members.
   */
  initGroups() {
    return Promise.all([
      this._database.getItemStore(Database.NAMESPACE.SYSTEM).queryItems({}, {}, { type: 'Group' }),
      this._database.getItemStore(Database.NAMESPACE.SYSTEM).queryItems({}, {}, { type: 'User'  })
    ]).then(([ groups, users ]) => {

      // Add User IDs of whitelisted users.
      _.each(groups, group => {
        group.members = _.compact(_.map(users, user => {
          if (_.indexOf(group.whitelist, user.email) != -1) {
            return user.id;
          }
        }));
      });

      return this._database.getItemStore(Database.NAMESPACE.SYSTEM).upsertItems({}, groups);
    });
  }
}

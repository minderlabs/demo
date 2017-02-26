//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { Database } from 'minder-graphql';

/**
 * Loads start-up and test data.
 */
export class Loader {

  constructor(database) {
    console.assert(database);
    this._database = database;
  }

  /**
   * Parse data file.
   * @param data JSON data file.
   * @param namespace
   */
  parse(data, namespace = Database.NAMESPACE.USER) {
    let parsedItems = [];

    // Iterate each item by type.
    _.each(data, (items, type) => {
      _.each(items, (item) => {
        item.type = type;

        // TODO(burdon): Factor out special type handling.
        // NOTE: The GraphQL schema defines filter as an input type.
        // In order to "store" the filter within the Folder's filter property, we need
        // to serialize it to a string (otherwise we need to create parallel output type defs).
        switch (type) {
          case 'Folder': {
            item.filter = JSON.stringify(item.filter);
            break;
          }

          // TODO(burdon): Set bucket; currently since context={} creating tasks fails since no accessible projects.
          // TODO(burdon): Select Group for context of generating data.
          case 'Project': {
            item.bucket = item.group;
            break;
          }
        }

        parsedItems.push(item);
      });
    });

    return this._database.upsertItems({}, parsedItems, namespace);
  }

  /**
   * Initialize group members.
   */
  initGroups() {
    return Promise.all([

      this._database.queryItems({}, {}, {
        namespace: Database.NAMESPACE.SYSTEM,
        type: 'Group'
      }),

      this._database.queryItems({}, {}, {
        namespace: Database.NAMESPACE.SYSTEM,
        type: 'User'
      })

    ]).then(([ groups, users ]) => {

      // Add User IDs of whitelisted users.
      _.each(groups, group => {
        group.members = _.compact(_.map(users, user => {
          if (_.indexOf(group.whitelist, user.email) != -1) {
            return user.id;
          }
        }));
      });

      return this._database.upsertItems({}, groups, Database.NAMESPACE.SYSTEM);
    });
  }
}

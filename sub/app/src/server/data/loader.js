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
  parse(data, namespace = Database.DEFAULT_NAMESPACE) {
    let parsedItems = [];

    // Iterate each item by type.
    _.each(data, (items, type) => {
      _.each(items, (item) => {
        item.type = type;

        // TODO(burdon): Factor out special type handling.
        // NOTE: The GraphQL schema defines filter as an input type.
        // In order to "store" the filter within the Folder's filter property, we need
        // to serialize it to a string (otherwise we need to create parallel output type defs).
        if (type == 'Folder') {
          item.filter = JSON.stringify(item.filter);
        }

        parsedItems.push(item);
      });
    });

    return this._database.upsertItems({}, parsedItems, namespace);
  }

  /**
   * Initialize groups.
   */
  initGroup(groupId) {
    console.log('Initializing database...');
    return this._database.queryItems({}, {}, {
      namespace: Database.SYSTEM_NAMESPACE,
      type: 'User'
    }).then(users => {
      // TODO(burdon): Query all groups and instantiate.

      // Get the group and add members.
      // TODO(burdon): Move whitelist to group-specific field (i.e., invite list).
      return this._database.getItem({}, 'Group', groupId, Database.SYSTEM_NAMESPACE)
        .then(group => {
          console.assert(group, 'Invalid Group: ' + groupId);

          // Add User IDs of whitelisted users.
          group.members = _.compact(_.map(users, user => {
            if (_.indexOf(group.whitelist, user.email) != -1) {
              return user.id;
            }
          }));

          // TODO(burdon): Need to rebuild on-the-fly as users login for the first time.
          return this._database.upsertItem({}, group, Database.SYSTEM_NAMESPACE);
        });
    });
  }
}

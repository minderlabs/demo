//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { Logger, Database, TypeUtil } from 'minder-core';

const logger = Logger.get('loader');

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
   * @param index Regular expression to identify items.
   */
  parse(data, namespace=Database.NAMESPACE.USER, index) {
    console.assert(data && namespace && index);
    logger.log('Parsing data: ' + index);

    // Build map of items.
    let itemsByAlias = new Map();
    TypeUtil.traverse(data, (value, key, root, path) => {
      let match = path.match(index);
      if (match) {
        let item = value;
        let type = match[1];
        match.splice(0, 2);

        item.alias = match.join('/');
        item.type = type;

        switch (type) {
          case 'Folder': {
            item.filter = JSON.stringify(item.filter);
            break;
          }
        }

//      console.log(item.alias + ' = ' + TypeUtil.stringify(item));
        itemsByAlias.set(item.alias, item);
        return false;
      }
    });

    let aliases = Array.from(itemsByAlias.keys());

    // Filter for items with matching aliases.
    let filter = {
      expr: {
        op: 'OR',
        expr: _.map(aliases, alias => ({
          field: 'alias',
          value: {
            string: alias
          }
        }))
      }
    };

    // Lookup up items with alias.
    let itemStore = this._database.getItemStore(namespace);
    return itemStore.queryItems({}, {}, filter).then(matchedItems => {

      // Update ID of mapped items and merge.
      _.each(matchedItems, item => {
        let alias = item.alias;
        let parsed = itemsByAlias.get(alias);

        // Merge.
        _.assign(item, parsed);
        itemsByAlias.set(alias, item);
      });

      let items = Array.from(itemsByAlias.values());

      return itemStore.upsertItems({}, items);
    });
  }

  /**
   * Initialize group members.
   */
  initGroups() {
    let systemStore = this._database.getItemStore(Database.NAMESPACE.SYSTEM);

    return Promise.all([
      systemStore.queryItems({}, {}, { type: 'Group' }),
      systemStore.queryItems({}, {}, { type: 'User'  })
    ]).then(([ groups, users ]) => {

      // Add User IDs of whitelisted users.
      _.each(groups, group => {
        group.members = _.compact(_.map(users, user => {
          if (_.indexOf(group.whitelist, user.email) != -1) {
            return user.id;
          }
        }));
      });

      let promises = _.map(groups, group => {
        return this.initProjects(group)
      });

      return Promise.all(promises).then(() => {
        return systemStore.upsertItems({}, groups);
      });
    });
  }

  /**
   * Provision default project for group.
   * @param group
   */
  initProjects(group) {
    logger.log('Group: ' + JSON.stringify(_.pick(group, ['id', 'title'])));

    let context = { groupId: group.id };
    let itemStore = this._database.getItemStore(Database.NAMESPACE.USER);
    return itemStore.queryItems(context, {}, { type: 'Project' }).then(projects => {

      // Look for default project.
      let project = _.find(projects, project => (_.indexOf(project.labels, '_default') != -1));
      if (project) {
        return project;
      } else {
        // Create it.
        return itemStore.upsertItem(context, {
          bucket: group.id,
          group: group.id,
          type: 'Project',
          labels: ['_default'],
          title: 'Default Project'
        });
      }
    });
  }
}

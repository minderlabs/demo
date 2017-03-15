//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { Database, ID, MutationUtil, Randomizer, Transforms } from 'minder-core';

/**
 * Test data.
 */
export class TestGenerator {

  // TODO(burdon): Created time (in past).
  // TODO(burdon): Should create links (e.g., Project <===> Task.)

  /**
   * Type Generators.
   * @param database
   * @constructor
   */
  static Generators = database => ({

    // TODO(burdon): Return mutations (to multiple items)? Are IDs resolved?
    // TODO(burdon): Create mutations with references (like client side mutator transaction).

    'Project': {

      bucket: (item, context) => context.groupId,

      group: (item, context) => context.groupId,

      title: (item, context, randomizer) =>
        randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 3, max: 5 }) }),
    },

    'Task': {

      bucket: (item, context) => context.groupId,

      // TODO(burdon): Set owner for all types in Randomizer?
      owner: (item, context) => context.userId,

      labels: (item, context, randomizer) =>
        randomizer.chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

      title: (item, context, randomizer) =>
        randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 3, max: 5 }) }),

      description: (item, context, randomizer) =>
        randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 10, max: 20 }) }),

      status: (item, context, randomizer) => randomizer.chance.natural({ min: 0, max: 3 }),

      assignee: (item, context, randomizer) => {
        if (randomizer.chance.bool()) {
          let { groupId } = context;
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'Group', groupId)
            .then(group => {
              console.assert(group);
              return randomizer.chance.pickone(group.members);
            });
        }
      },

      project: (item, context, randomizer) => {
        return database.getQueryProcessor(Database.NAMESPACE.USER).queryItems(context, {}, {
          type: 'Project'
        }).then(projects => {
          if (_.isEmpty(projects)) {
            console.warn('No projects for: ' + JSON.stringify(context));
            return null;
          }

          let project = randomizer.chance.pickone(projects);
          return project.id;
        });
      },

      topLevel: () => true,

      tasks: (item, context, randomizer) => {
        let { groupId, userId } = context;
        console.assert(groupId && userId);
        let num = randomizer.chance.natural({ min: 0, max: 5 });
        if (num) {
          // TODO(burdon): Reuse generator? (but same project).
          return database.getItemStore(Database.NAMESPACE.USER).upsertItems(context, _.times(num, i => ({
            type: 'Task',
            bucket: context.groupId,
            title: randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 3, max: 5 }) }),
            project: item.project,
            owner: context.userId,
            status: randomizer.chance.bool() ? 0 : 3
          }))).then(items => {
            return _.map(items, item => item.id);
          });
        }
      }
    }
  });

  /**
   * Link Generators -- generate mutations.
   */
  static Linkers = {

    // Add project to group.
    'Project': (item, context) => {
      return {
        itemId: ID.toGlobalId('Group', item.group),
        mutations: [
          MutationUtil.createSetMutation('projects', 'id', item.id)
        ]
      };
    },

    // Add task to project.
    'Task': (item, context) => {
      if (item.project) {
        return {
          itemId: ID.toGlobalId('Project', item.project),
          mutations: [
            MutationUtil.createSetMutation('tasks', 'id', item.id)
          ]
        };
      }
    }
  };

  constructor(database) {
    console.assert(database);
    this._database = database;
    this._randomizer = new Randomizer(TestGenerator.Generators(database), TestGenerator.Linkers);
  }

  /**
   * Generate items for users.
   */
  generate() {
    // Generate for each user.
    return this._database.getQueryProcessor(Database.NAMESPACE.SYSTEM)
      .queryItems({}, {}, { type: 'User' })
      .then(users => {
        return Promise.all(_.map(users, user => {
          let { id:userId, email } = user;

          // Lookup by Groups for User.
          // TODO(burdon): Should be enforced by store given context?
          return this._database.getQueryProcessor(Database.NAMESPACE.SYSTEM)
            .queryItems({ userId }, {}, {
              type: 'Group',
              expr: {
                field: 'members',
                ref: '$CONTEXT.userId',
                comp: 'IN'
              }
            }).then(groups => {
              return Promise.all(_.map(groups, group => {
                let { id:groupId } = group;
                let context = { groupId, userId };

                //
                // Generate data items for each user.
                //
                return Promise.resolve()
                  .then(() =>
                    this.generateItems(context, 'Project', 1))
                  // .then(() =>
                  //   this.generateItems(context, 'Task', this._randomizer.chance.natural({ min: 20, max: 40 })));
              }));
            });
        }));
    });
  }

  generateItems(context, type, count) {
    const getStore = type => {
      switch (type) {
        case 'Group':
          return this._database.getItemStore(Database.NAMESPACE.SYSTEM);

        default:
          return this._database.getItemStore(Database.NAMESPACE.USER);
      }
    };

    // Generate items.
    return this._randomizer.generateItems(context, type, count)
      .then(items => {

        // Upsert items.
        return getStore(type).upsertItems(context, items).then(items => {

          _.each(items, item => {
            console.log('Test: ' + JSON.stringify(_.pick(item, ['id', 'type', 'title'])));
          });

          // Generate and save links.
          return this._randomizer.generateLinkMutations(context, items).then(itemMutations => {

            // Load and update items.
            return Promise.all(_.each(itemMutations, itemMutation => {
              let { type, id:itemId } = ID.fromGlobalId(itemMutation.itemId);

              let itemStore = getStore(type);
              return itemStore.getItem(context, type, itemId).then(item => {
                console.assert(item);

                Transforms.applyObjectMutations(item, itemMutation.mutations);
                return itemStore.upsertItem(context, item);
              });
            }));
          })
        });
      });
  }
}

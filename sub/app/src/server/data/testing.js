//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { Logger, Database, ID, MutationUtil, Randomizer, Transforms } from 'minder-core';

import { TASK_LEVELS } from '../../common/const';

const logger = Logger.get('testing');

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

    'Project': [

      Randomizer.property('bucket', (item, context, randomizer) => randomizer.chance.pickone(context.groupIds)),

      Randomizer.property('group', (item, context) => item.bucket),

      Randomizer.property('title', (item, context, randomizer) =>
        randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 3, max: 5 }) })),
    ],

    'Task': [

      Randomizer.property('bucket', (item, context, randomizer) => randomizer.chance.pickone(context.groupIds)),

      // TODO(burdon): Set owner for all types in Randomizer?
      Randomizer.property('owner', (item, context) => context.userId),

      Randomizer.property('labels', (item, context, randomizer) =>
        randomizer.chance.bool({ likelihood: 20 }) ? ['_favorite'] : []),

      Randomizer.property('title', (item, context, randomizer) =>
        randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 3, max: 5 }) })),

      Randomizer.property('description', (item, context, randomizer) =>
        randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 10, max: 20 }) })),

      Randomizer.property('status', (item, context, randomizer) => randomizer.chance.natural({
        min: TASK_LEVELS.UNSTARTED,
        max: TASK_LEVELS.BLOCKED
      })),

      Randomizer.property('assignee', (item, context, randomizer) => {
        if (randomizer.chance.bool()) {
          return database.getItemStore(Database.NAMESPACE.SYSTEM).getItem(context, 'Group', item.bucket)
            .then(group => {
              console.assert(group);
              return randomizer.chance.pickone(group.members);
            });
        }
      }),

      // TODO(burdon): Do this first and "cache" the group in the context?
      Randomizer.property('project', (item, context, randomizer) => {
        return database.getQueryProcessor(Database.NAMESPACE.USER).queryItems({ groupIds: [item.bucket] }, {}, {
          type: 'Project'
        }).then(projects => {
          if (_.isEmpty(projects)) {
            console.warn('No projects for: ' + JSON.stringify(context));
            return null;
          }

          let project = randomizer.chance.pickone(projects);
          return project.id;
        });
      }),

      Randomizer.property('tasks', (item, context, randomizer) => {
        let { userId } = context;
        let num = randomizer.chance.natural({ min: 0, max: 5 });
        if (num) {
          // TODO(burdon): Reuse generator? (but same project).
          return database.getItemStore(Database.NAMESPACE.USER).upsertItems(context, _.times(num, i => ({
            type: 'Task',
            bucket: item.bucket,
            title: randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 3, max: 5 }) }),
            project: item.project,
            owner: userId,
            status: randomizer.chance.bool() ? TASK_LEVELS.UNSTARTED : TASK_LEVELS.COMPLETE
          }))).then(items => {
            return _.map(items, item => item.id);
          });
        }
      })
    ]
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
          let { id:userId } = user;
          console.assert(userId);

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
                let context = { userId, groupIds: [group.id] };

                //
                // Generate data items for each user.
                //
                return Promise.resolve()
                  // TODO(burdon): Add default label for private project.
                  // TODO(burdon): Auto-provision project when creating a group.
                  .then(() =>
                    this.generateItems(context, 'Project', 0))
                  .then(() =>
                    this.generateItems(context, 'Task', this._randomizer.chance.natural({ min: 1, max: 1 })));
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
            logger.log('Test: ' + JSON.stringify(_.pick(item, ['id', 'type', 'title'])));
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

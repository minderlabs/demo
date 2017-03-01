//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import { ID, MutationUtil, Randomizer, Transforms } from 'minder-core';
import { Database } from 'minder-graphql';

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
          console.assert(!_.isEmpty(projects), 'No projects for: ' + JSON.stringify(context));
          let project = randomizer.chance.pickone(projects);
          return project.id;
        });
      },

      tasks: (item, context, randomizer) => {
        let { groupId, userId } = context;
        console.assert(groupId && userId);
        let num = randomizer.chance.natural({ min: 0, max: 5 });
        if (num) {
          // TODO(burdon): Reuse generator? (but same project).
          return database.getItemStore(Database.NAMESPACE.USER).upsertItems(context, _.times(num, i => ({
            type: 'Task',
            bucket: context.groupId,
            owner: context.userId,
            title: randomizer.chance.sentence({ words: randomizer.chance.natural({ min: 3, max: 5 }) }),
            status: randomizer.chance.bool() ? 0 : 3,
            project: item.project
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

    'Task': (item, context) => {
      return {
        itemId: ID.toGlobalId('Project', item.project),
        mutations: [
          MutationUtil.createSetMutation('tasks', 'id', item.id)
        ]
      };
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
                field: 'members', ref: '$CONTEXT.userId', comp: 'IN'
              }
            }).then(groups => {
              return Promise.all(_.map(groups, group => {
                let { id:groupId } = group;
                let context = { groupId, userId };

                let promises = [];

                // Create Tasks for User.
                promises.push(this._randomizer.generateItems(
                  context, 'Task', this._randomizer.chance.natural({ min: 20, max: 40 }))
                    .then(items => this.processItems(context, items)));

                return Promise.all(promises);
              }));
            });
        }));
    });
  }

  /**
   * Upsert created items, then generate links and upsert those.
   */
  processItems(context, items) {
    let itemStore = this._database.getItemStore(Database.NAMESPACE.USER);

    return itemStore.upsertItems(context, items).then(items => {

      // Generate and save links.
      return this._randomizer.generateLinkMutations(context, items).then(itemMutations => {

        // Load and update items.
        return Promise.all(_.each(itemMutations, itemMutation => {
          let { type, id:itemId } = ID.fromGlobalId(itemMutation.itemId);
          return itemStore.getItem(context, type, itemId).then(item => {
            Transforms.applyObjectMutations(item, itemMutation.mutations);
            return itemStore.upsertItem(context, item);
          });
        }));
      })
    })
  }
}

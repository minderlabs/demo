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

  // TODO(burdon): Set created time (in past).
  // TODO(burdon): Should create links (e.g., Project <===> Task.)

  /**
   * Type Generators.
   * @param itemStore
   * @constructor
   */
  static Generators = itemStore => ({

    // TODO(burdon): Return mutations (to multiple items)? Are IDs resolved?
    // TODO(burdon): Create mutations with references (like client side mutator transaction).

    'Task': {

      // TODO(burdon): Set owner for all types in Randomizer?
      owner: (item, context, randomizer) => context.userId,

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
          return itemStore.getItem(context, 'Group', groupId, Database.NAMESPACE.SYSTEM).then(group => {
            console.assert(group);
            return randomizer.chance.pickone(group.members);
          });
        }
      },

      project: (item, context, randomizer) => {
        return itemStore.queryItems(context, {}, {
          type: 'Project'
        }).then(projects => {
          if (!_.isEmpty(projects)) {
            let project = randomizer.chance.pickone(projects);
            return project.id;
          }
        });
      },

      tasks: (item, context, randomizer) => {
        let num = randomizer.chance.natural({ min: 0, max: 5 });
        if (num) {
          // TODO(burdon): Reuse generator? (but same project).
          return itemStore.upsertItems(context, _.times(num, i => ({
            type: 'Task',
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
   *
   * @param itemStore
   * @constructor
   */
  static Linkers = itemStore => ({

    'Task': (item, context) => ({
      itemId: ID.toGlobalId('Project', item.project),
      mutations: [
        MutationUtil.createSetMutation('tasks', 'id', item.id)
      ]
    })
  });

  constructor(itemStore) {
    console.assert(itemStore);
    this._itemStore = itemStore;
    this._randomizer = new Randomizer(TestGenerator.Generators(itemStore), TestGenerator.Linkers(itemStore));
    console.log('Store: ' + String(itemStore.getItemStore()));
  }

  generate() {

    // Generate items for users.
    return this._itemStore.queryItems({}, {}, {
      namespace: Database.NAMESPACE.SYSTEM,
      type: 'User'
    }).then(users => {
      return Promise.all(_.map(users, user => {
        let { id:userId, email } = user;
        console.log('User: ' + email);

        // Lookup by Groups for User.
        // TODO(burdon): Should be enforced by store given context?
        return this._itemStore.queryItems({
          userId
        }, {}, {
          namespace: Database.NAMESPACE.SYSTEM,
          type: 'Group',
          expr: {
            field: 'members', ref: '$CONTEXT.userId', comp: 'IN'
          }
        }).then(groups => {
          return Promise.all(_.map(groups, group => {
            let { id:groupId } = group;
            let context = { groupId, userId };

            // TODO(burdon): Factor out saving and applying links (not type specific).
            let num = this._randomizer.chance.natural({ min: 20, max: 30 });
            return this._randomizer.generateItems(context, 'Task', num).then(items => {
              return this._itemStore.upsertItems(context, items).then(items => {
                return this._randomizer.generateLinkMutations(context, items).then(itemMutations => {
                  return Promise.all(_.each(itemMutations, itemMutation => {
                    let { type, id:itemId } = ID.fromGlobalId(itemMutation.itemId);
                    return this._itemStore.getItem(context, type, itemId).then(item => {
                      Transforms.applyObjectMutations(item, itemMutation.mutations);
                      return this._itemStore.upsertItem(context, item);
                    });
                  }));
                })
              })
            });
          }));
        });
      }));
    });
  }
}

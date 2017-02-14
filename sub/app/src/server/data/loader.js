//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { Randomizer, TypeUtil } from 'minder-core';

import { Const } from '../../common/defs';

/**
 * Loads start-up and test data.
 */
export class DataLoader {

  constructor(database) {
    console.assert(database);
    this._database = database;

    this._context = {
      user: {
        id: null
      }
    };
  }

  /**
   * Parse data file.
   * @param data JSON data file.
   */
  parse(data) {
    _.each(data, (items, type) => {

      // Iterate items per type.
      this._database.upsertItems(this._context, _.map(items, (item) => {

        // NOTE: The GraphQL schema defines filter as an input type.
        // In order to "store" the filter within the Folder's filter property, we need
        // to serialize it to a string (otherwise we need to create parallel output type defs).
        if (type == 'Folder') {
          item.filter = JSON.stringify(item.filter);
        }

        return { type, ...item };
      }));
    });

    return Promise.resolve();
  }

  /**
   * Setup data store.
   */
  init(whitelist, testing) {
    console.log('Initializing database...');
    return this._database.queryItems(this._context, {}, { type: 'User' })

      .then(users => {
        // Get the group and add members.
        // TODO(burdon): Whitelist.
        return this._database.getItem(this._context, 'Group', Const.DEF_GROUP)
          .then(group => {
            let members = _.get(whitelist, group.id);
            group.members = _.compact(_.map(users, user => {
              if (_.indexOf(members, user.email) != -1) {
                return user.id;
              }
            }));

            return this._database.upsertItem(this._context, group);
          });
      })

      .then(group => {
        // TODO(burdon): Is this needed in the GraphQL context below?
        this._context.group = group;

        if (testing) {
          this.generateTestData();
        }
      });
  }

  /**
   * Generate random data for testing.
   */
  generateTestData() {
    // TODO(burdon): Pass query registry into Randomizer.
    let randomizer = new Randomizer(this._database, _.defaults(this._context, {
      created: moment().subtract(10, 'days').unix()
    }));

    return Promise.all([
      randomizer.generate('Task', 30, {

        status: () => randomizer.chance.natural({ min: 0, max: 3 }),

        project: {
          type: 'Project',
          likelihood: 0.75,

          //
          // Fantastically elaborate mechanism to create bi-directional links (add tasks to project).
          //
          onCreate: (randomizer, tasks) => {
            let mutatedProjects = {};
            return TypeUtil.iterateWithPromises(tasks, task => {

              // Add to project.
              let projectId = task.project;
              if (projectId) {
                return randomizer.queryCache({ ids: [projectId] }).then(projects => {
                  let project = projects[0];
                  project.tasks = TypeUtil.maybeAppend(project.tasks, task.id);
                  mutatedProjects[project.id] = project;
                }).then(() => {

                  // Create sub-tasks.
                  if (randomizer.chance.bool({ likelihood: 30 })) {
                    randomizer.generate('Task', randomizer.chance.natural({ min: 1, max: 3 }), {
                      status: () => randomizer.chance.bool({ likelihood: 50 }) ? 0 : 3,
                    }).then(tasks => {

                      // Add sub-tasks to parent task.
                      task.tasks = _.map(tasks, task => task.id);
                      return randomizer.upsertItems([task]);
                    });
                  }
                });
              }
            }).then(() => {
              return randomizer.upsertItems(Object.values(mutatedProjects));
            });
          }
        },

        owner: {
          type: 'User',
          likelihood: 1.0
        },

        assignee: {
          type: 'User',
          likelihood: 0.5
        }
      }),

      randomizer.generate('Contact', 10),
      randomizer.generate('Place', 10)
    ]);
  }
}

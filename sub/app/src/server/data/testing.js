//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { Randomizer, TypeUtil } from 'minder-core';

/**
 * Test data.
 */
export class TestData {

  static randomizer(itemStore) {
    // TODO(burdon): Pass query registry into Randomizer.
    return new Randomizer(itemStore, _.defaults({}, {
      created: moment().subtract(10, 'days').unix()
    }));
  }

  static TaskFields = (randomizer) => ({

    status: () => randomizer.chance.natural({ min: 0, max: 3 }),

    // TODO(burdon): Select User from project's Group.
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
  });
}

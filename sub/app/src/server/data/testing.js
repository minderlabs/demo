//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { Randomizer, TypeUtil } from 'minder-core';
import { Database } from 'minder-graphql';

/**
 * Test data.
 */
export class TestData {

  static randomizer(database, itemStore, context={}) {
    const queryItems = (type) => database.queryItems(context, {}, {
      namespace: Database.getNamespaceForType(type),
      type
    });

    return new Randomizer(itemStore, queryItems, {
      created: moment().subtract(10, 'days').unix()
    });
  }

  static TaskFields = (randomizer) => ({

    status: () => randomizer.chance.natural({ min: 0, max: 3 }),

    // TODO(burdon): Select Users, Project from Group (spec group in context).

    owner: {
      type: 'User',
      likelihood: 100
    },

    assignee: {
      type: 'User',
      likelihood: 50
    },

    project: {
      type: 'Project',
      likelihood: 75,

      //
      // Create bi-directional links (add tasks to project).
      //
      onCreate: (randomizer, tasks) => {
        let mutatedProjects = {};
        return TypeUtil.iterateWithPromises(tasks, task => {
          let projectId = task.project;
          if (projectId) {
            return randomizer.queryCache('Project').then(projects => {
              console.assert(projects);

              // Add to tasks to project.
              let project = _.find(projects, project => project.id === projectId);
              project.tasks = TypeUtil.maybeAppend(project.tasks, task.id);
              mutatedProjects[projectId] = project;
            }).then(() => {

              // Create sub-tasks.
              if (randomizer.chance.bool({ likelihood: 30 })) {
                randomizer.generate('Task', randomizer.chance.natural({ min: 1, max: 3 }), {
                  status: () => randomizer.chance.bool({ likelihood: 50 }) ? 0 : 3,
                  owner: () => task.owner
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
    }
  });
}

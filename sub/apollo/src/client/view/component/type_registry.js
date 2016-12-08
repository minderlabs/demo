//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import User,  { UserFragments   } from './type/user';
import Group, { GroupFragments  } from './type/group';
import Place, { PlaceFragments  } from './type/place';
import Task,  { TaskFragments   } from './type/task';

/**
 * Type registry.
 */
export class TypeRegistry {

  // TODO(burdon): Support different views per type.

  // TODO(burdon): Remove (currently needed for static query defs).
  static get singleton() {
    return registry;
  };

  constructor() {
    this._types = new Map();
  }

  render(item, userId) {
    let spec = this._types.get(item.type);
    return spec && spec.render(item, userId) || (<div>NO TYPE HANDLER FOR [{ item.type }]</div>);
  }

  // TODO(burdon): Factor out mutator requirements (provide object).
  path(type) {
    let spec = this._types.get(type);
    return spec && spec.path;
  }

  icon(type) {
    let spec = this._types.get(type);
    return spec && spec.icon || '';
  }

  get names() {
    return _.map(Array.from(this._types.values()), (spec) => spec.fragment.item.document.definitions[0].name.value);
  }

  get fragments() {
    return _.map(Array.from(this._types.values()), (spec) => spec.fragment.item.fragments());
  }
}

const registry = new TypeRegistry();

registry._types.set('User', {
  fragment: UserFragments,
  render: (item, user) => <User user={ user } item={ item }/>,
  icon: 'accessibility'
});

registry._types.set('Group', {
  fragment: GroupFragments,
  render: (item, user) => <Group user={ user } item={ item }/>,
  icon: 'group',

  path: (matcher, previousResult, item) => {

    // TODO(burdon): Move to MuationContextManager (manages map of fragments and paths).
    // TODO(burdon): Holy grail would be to introspect the query and do this automatically (DESIGN DOC).
    // TODO(burdon): First pass: factor out common parts with Reducer.

    // Find associated member.
    let members = _.get(previousResult, 'item.members');
    let assignee = _.get(item, 'assignee.id');
    let idx = _.findIndex(members, (member) => member.id === assignee);
    console.assert(idx != -1, 'Invalid ID: %s', assignee);

    // Add, update or remove.
    let member = members[idx];
    let tasks = member.tasks;
    let taskIdx = _.findIndex(tasks, (task) => task.id == item.id);

    let op = {
      $apply: (tasks) => {
        if (taskIdx == -1) {
          return [...tasks, item];
        } else {
          return _.compact(_.map(tasks, (task) => {
            if (task.id == item.id) {
              // TODO(burdon): Context.
              // TODO(burdon): Extract filter from query and use matcher to determine if remove.
              const filter = { expr: { field: "assignee", value: { id: member.id } } };
              if (matcher.matchItem({}, {}, filter, item)) {
                return item;
              }
            } else {
              return task;
            }
          }));
        }
      }
    };

    return { item: { members: { [idx]: { tasks: op } } } };
  }
});

registry._types.set('Place', {
  fragment: PlaceFragments,
  render: (item, user) => <Place user={ user } item={ item }/>,
  icon: 'location_city'
});

registry._types.set('Task', {
  fragment: TaskFragments,
  render: (item, user) => <Task user={ user } item={ item }/>,
  icon: 'assignment_turned_in'
});

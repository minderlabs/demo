//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import UserCard from './user';
import GroupCard from './group';
import PlaceCard from './place';
import TaskCard from './task';

/**
 * Type registry.
 */
export class TypeRegistry {

  constructor() {
    // Map of type registrations by type name.
    this._types = new Map();
  }

  // TODO(burdon): Support different views per type.
  render(type, itemId) {
    console.assert(type && itemId);
    let spec = this._types.get(type);
    return spec && spec.render(itemId) || <div>NO HANDLER FOR [{ type }]</div>;
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

  fragment(type) {
    return this._types.get(type).fragment;
  }
}

/**
 * Utility to create the TypeRegistry singleton.
 */
export class TypeFactory {

  // TODO(burdon): Constants for type names.

  static create() {
    let registry = new TypeRegistry();

    registry._types.set('User', {
      icon: 'accessibility',
      render: (itemId) => <UserCard itemId={ itemId }/>
    });

    registry._types.set('Group', {
      icon: 'group',
      render: (itemId) => <GroupCard itemId={ itemId }/>,

      path: (context, matcher, previousResult, item) => {

        // TODO(burdon): Move to MuationContextManager (manages map of fragments and paths).
        // TODO(burdon): Holy grail would be to introspect the query and do this automatically (DESIGN DOC).
        // TODO(burdon): First pass: factor out common parts with Reducer.

        // TODO(burdon): FIX: Not part of main query (e.g., shared notes).
        let assignee = _.get(item, 'assignee.id');
        if (!assignee) {
          return;
        }

        // Find associated member.
        let members = _.get(previousResult, 'item.members');
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
                  if (matcher.matchItem(context, {}, filter, item)) {
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
      icon: 'location_city',
      render: (itemId) => <PlaceCard itemId={ itemId }/>
    });

    registry._types.set('Task', {
      icon: 'assignment_turned_in',
      render: (itemId) => <TaskCard itemId={ itemId }/>
    });

    return registry;
  }
}

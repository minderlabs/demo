//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import UserCard from './user';
import GroupCard from './group';
import PlaceCard from './place';
import ProjectCard from './project';
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
  reducer(type) {
    let spec = this._types.get(type);
    return spec && spec.reducer;
  }

  icon(type) {
    let spec = this._types.get(type);
    return spec && spec.icon || '';
  }
}

/**
 * Utility to create the TypeRegistry singleton.
 */
export class TypeFactory {

  // TODO(burdon): Constants for type names.

  static create() {
    let registry = new TypeRegistry();

    registry._types.set('Group', {
      icon: 'group',
      render: (itemId) => <GroupCard itemId={ itemId }/>,
      reducer: GroupCard.reducer
    });

    registry._types.set('Place', {
      icon: 'location_city',
      render: (itemId) => <PlaceCard itemId={ itemId }/>
    });

    registry._types.set('Project', {
      icon: 'assignment',
      render: (itemId) => <ProjectCard itemId={ itemId }/>
    });

    registry._types.set('Task', {
      icon: 'assignment_turned_in',
      render: (itemId) => <TaskCard itemId={ itemId }/>
    });

    registry._types.set('User', {
      icon: 'accessibility',
      render: (itemId) => <UserCard itemId={ itemId }/>
    });

    return registry;
  }
}

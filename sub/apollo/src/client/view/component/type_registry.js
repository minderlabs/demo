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
class TypeRegistry {

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
  render: (item, userId) => <User  userId={ userId } item={ item }/>,
  icon: 'accessibility'
});

registry._types.set('Group', {
  fragment: GroupFragments,
  render: (item, userId) => <Group userId={ userId } item={ item }/>,
  icon: 'group'
});

registry._types.set('Place', {
  fragment: PlaceFragments,
  render: (item, userId) => <Place userId={ userId } item={ item }/>,
  icon: 'location_city'
});

registry._types.set('Task', {
  fragment: TaskFragments,
  render: (item, userId) => <Task  userId={ userId } item={ item }/>,
  icon: 'assignment_turned_in',

  // TODO(burdon): Move to MuationContextManager (manages map of fragments and paths).
  path: (previousResult, item, op) => {
    // Find associated member.
    let idx = _.findIndex(_.get(previousResult, 'item.members'), (member) => member.id === _.get(item, 'assignee.id'));
    if (idx === -1) {
      console.warn('INVALID PATH', item, _.get(previousResult, 'item.members'));
    } else {
      return { item: { members: { [idx]: { tasks: op } } } };
    }
  }
});

export default registry;

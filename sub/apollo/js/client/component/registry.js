//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import User,  { UserFragments   } from './type/user';
import Group, { GroupFragments  } from './type/group';
import City,  { CityFragments   } from './type/city';
import Task,  { TaskFragments   } from './type/task';

/**
 * Type registry.
 */
class TypeRegistry {

  constructor() {
    this.types = new Map();
  }

  render(item) {
    let value = this.types.get(item.type);
    return value.render(item);
  }

  get names() {
    return _.map(Array.from(this.types.values()), (value) => value.fragment.item.document.definitions[0].name.value);
  }

  get fragments() {
    return _.map(Array.from(this.types.values()), (value) => value.fragment.item.fragments());
  }
}

const registry = new TypeRegistry();

registry.types.set('User',  { fragment: UserFragments,  render: (item) => <User   item={ item }/> });
registry.types.set('Group', { fragment: GroupFragments, render: (item) => <Group  item={ item }/> });
registry.types.set('City',  { fragment: CityFragments,  render: (item) => <City   item={ item }/> });
registry.types.set('Task',  { fragment: TaskFragments,  render: (item) => <Task   item={ item }/> });

export default registry;

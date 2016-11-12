//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import City, { CityFragments } from './city';
import Task, { TaskFragments } from './task';

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

registry.types.set('City', { fragment: CityFragments, render: (item) => <City item={ item }/> });
registry.types.set('Task', { fragment: TaskFragments, render: (item) => <Task item={ item }/> });

export default registry;

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import Note from './type/note';
import Task from './type/task';

/**
 * Type registry.
 * TODO(burdon): Factor out.
 */
class TypeRegistry {

  constructor() {
    this._types = [];
    this._renderers = new Map();
  }

  add(typeName, typeClass, typeRenderer) {
    this._types.push(typeClass);
    this._renderers.set(typeName, typeRenderer);
  }

  get types() {
    return this._types
  }

  render(typeName, item) {
    let renderer = this._renderers.get(typeName);
    return renderer && renderer(item) || null;
  }
}

const TYPE_REGISTRY = new TypeRegistry();

TYPE_REGISTRY.add('Note', Note, (item) => <Note data={ item.data }/>);
TYPE_REGISTRY.add('Task', Task, (item) => <Task data={ item.data }/>);

export default TYPE_REGISTRY;

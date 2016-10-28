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
    this._icons = new Map();
  }

  add(typeName, typeClass, typeRenderer, icon) {
    this._types.push(typeClass);
    this._renderers.set(typeName, typeRenderer);
    this._icons.set(typeName, icon)
  }

  get types() {
    return this._types
  }

  icon(typeName) {
    return this._icons.get(typeName);
  }

  render(viewer, item) {
    let renderer = this._renderers.get(item.type);
    return renderer && renderer(viewer, item) || null;
  }
}

const TYPE_REGISTRY = new TypeRegistry();

TYPE_REGISTRY.add('Note', Note,
  (viewer, item) => <Note viewer={ viewer } data={ item.data }/>, 'description');

TYPE_REGISTRY.add('Task', Task,
  (viewer, item) => <Task viewer={ viewer } data={ item.data }/>, 'assignment_turned_in');

export default TYPE_REGISTRY;

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import Note from './type/note';
import Task from './type/task';

/**
 * Type registry.
 *
 * https://material.io/icons
 */
class TypeRegistry {

  // Ref name used to access element.
  static REF = 'data';

  constructor() {
    this._types = new Map();
  }

  add(type, props) {
    this._types.set(type, props);
  }

  get types() {
    return _.map(Array.from(this._types.values()), (props) => props.type);
  }

  icon(typeName) {
    let props = this._types.get(typeName);
    return props && props['icon'] || '';
  }

  render(viewer, item) {
    let props = this._types.get(item.type);
    return props['render'](viewer, item);
  }

  values(type, element) {
    let props = this._types.get(type);
    return props['values'](element);
  }
}

const TYPE_REGISTRY = new TypeRegistry();

TYPE_REGISTRY.add('Note', {
  type: Note,
  icon: 'description',
  render: (viewer, item) => <Note ref={ TypeRegistry.REF } viewer={ viewer } data={ item.data }/>,
  values: (component) => {
    return component.values;
  }
});

TYPE_REGISTRY.add('Task', {
  type: Task,
  icon: 'assignment_turned_in',
  render: (viewer, item) => <Task ref={ TypeRegistry.REF } viewer={ viewer } data={ item.data }/>,
  values: (component) => {
    return component.values;
  }
});

// TODO(burdon): Don't add until sub-type is added (need fragment).

// TYPE_REGISTRY.add('User', {
//   icon: 'person_outline',
// });
//
// TYPE_REGISTRY.add('Group', {
//   icon: 'group',
// });

export default TYPE_REGISTRY;

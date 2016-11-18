//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import Group from './type/group';
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

  get components() {
    return _.map(Array.from(this._types.values()), (props) => props.component);
  }

  icon(typeName) {
    let props = this._types.get(typeName);
    return props && props['icon'] || '';
  }

  render(viewer, item) {
    let props = this._types.get(item.type);
    return props && props['render'](viewer, item) || null;
  }

  values(type, element) {
    let props = this._types.get(type);
    return props && props['values'](element) || {};
  }
}

const TYPE_REGISTRY = new TypeRegistry();

// TODO(burdon): Base type.

TYPE_REGISTRY.add('Group', {
  component: Group,
  icon: 'group',
  render: (viewer, item) => <Group ref={ TypeRegistry.REF } viewer={ viewer } data={ item.data }/>,
  values: (component) => {
    return component.values;
  }
});

TYPE_REGISTRY.add('Note', {
  component: Note,
  icon: 'description',
  render: (viewer, item) => <Note ref={ TypeRegistry.REF } viewer={ viewer } data={ item.data }/>,
  values: (component) => {
    return component.values;
  }
});

TYPE_REGISTRY.add('Task', {
  component: Task,
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

//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { UserCard } from './user';
import { TeamCard } from './team';
import { PlaceCard } from './place';
import { ProjectCard, ProjectBoard } from './project';
import { TaskCard, TaskCompactCard } from './task';
import { DocumentCard, DocumentColumn } from './document';

/**
 * Type registry.
 */
export class TypeRegistry {

  /**
   * System singleton.
   * @param types Map of type specs.
   */
  constructor(types) {
    this._types = new Map(types);
  }

  // TODO(burdon): Rationalize canvas/card/compact, etc.

  /**
   * Canvas component for page view.
   *
   * @param type
   * @param itemId
   * @param canvas
   * @returns {XML}
   */
  canvas(type, itemId, canvas='card') {
    console.assert(type && itemId);
    let spec = this._types.get(type);
    if (spec) {
      let gen = _.get(spec.canvas, canvas);
      return gen && gen(itemId);
    }
  }

  compact(item) {
    console.assert(item);
    let spec = this._types.get(item.type);
    if (spec) {
      let gen = _.get(spec.canvas, 'compact');
      return gen && gen(item);
    }
  }

  /**
   * Custom list column for list view.
   *
   * @returns {React.Component}
   */
  column(item) {
    console.assert(item);
    let spec = this._types.get(item.type);
    return spec && spec.column && spec.column(item) || null;
  }

  /**
   * material-icons icon.
   *
   * @param item
   * @return {V|icon|(function(*): string)|string|TypeRegistry.icon|string|*|*}
   */
  icon(item) {
    console.assert(item);
    let spec = this._types.get(item.type);
    return spec && spec.icon || '';
  }
}

/**
 * Class utility to create the TypeRegistry singleton.
 */
export const TypeRegistryDefs = new TypeRegistry([

  ['Document', {
    icon: 'insert_drive_file',
    canvas: {
      card: (itemId) => <DocumentCard itemId={ itemId }/>
    },
    column: (item) => <DocumentColumn item={ item }/>
  }],

  ['Group', {
    icon: 'group',
    canvas: {
      card: (itemId) => <TeamCard itemId={ itemId }/>
    }
  }],

  ['Place', {
    icon: 'location_city',
    canvas: {
      card: (itemId) => <PlaceCard itemId={ itemId }/>
    }
  }],

  ['Project', {
    icon: 'assignment',
    canvas: {
      card: (itemId) => <ProjectCard itemId={ itemId }/>,
      board: (itemId) => <ProjectBoard itemId={ itemId } expand={ true }/>
    }
  }],

  ['Task', {
    icon: 'assignment_turned_in',
    canvas: {
      card: (itemId) => <TaskCard itemId={ itemId }/>,
      compact: (item) => <TaskCompactCard item={ item }/>
    }
  }],

  ['User', {
    icon: 'accessibility',
    canvas: {
      card: (itemId) => <UserCard itemId={ itemId }/>
    }
  }]

]);

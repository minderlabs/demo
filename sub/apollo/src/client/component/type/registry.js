//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { UserCard } from './user';
import { TeamCard } from './team';
import { PlaceCard } from './place';
import { ProjectCard } from './project';
import { TaskCard } from './task';
import { DocumentCard, DocumentColumn } from './document';

/**
 * Type registry.
 */
export class TypeRegistry {

  /**
   *
   * @param types Map of type specs.
   */
  constructor(types) {
    this._types = new Map(types);
  }

  // TODO(burdon): Support different views per type. renderCard (level of detail), renderView, etc.

  /**
   * Canvas component for page view.
   *
   * @param type
   * @param itemId
   * @returns {XML}
   */
  canvas(type, itemId) {
    console.assert(type && itemId);
    let spec = this._types.get(type);
    return spec && spec.canvas(itemId) || <div>Invalid Canvas: { type }</div>;
  }

  /**
   * Item card for detail view.
   *
   * @param type
   * @param itemId
   * @returns {React.Component}
   */
  card(type, itemId) {
    console.assert(type && itemId);
    let spec = this._types.get(type);
    return spec && spec.card(itemId) || <div>Invalid Card: { type }</div>;
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

  ['Board', {
    icon: 'view_column',
    card: (itemId) => <BoardCard itemId={ itemId }/>
  }],

  ['Document', {
    icon: (item) => 'insert_drive_file',
    card: (itemId) => <DocumentCard itemId={ itemId }/>,
    column: (item) => <DocumentColumn item={ item }/>
  }],

  ['Group', {
    icon: 'group',
    card: (itemId) => <TeamCard itemId={ itemId }/>
  }],

  ['Place', {
    icon: 'location_city',
    card: (itemId) => <PlaceCard itemId={ itemId }/>
  }],

  ['Project', {
    icon: 'assignment',
    card: (itemId) => <ProjectCard itemId={ itemId }/>
  }],

  ['Task', {
    icon: 'assignment_turned_in',
    card: (itemId) => <TaskCard itemId={ itemId }/>
  }],

  ['User', {
    icon: 'accessibility',
    card: (itemId) => <UserCard itemId={ itemId }/>
  }]

]);

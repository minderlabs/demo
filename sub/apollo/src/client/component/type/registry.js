//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { BoardCard } from './board';
import { UserCard } from './user';
import { TeamCard } from './team';
import { PlaceCard } from './place';
import { ProjectCard } from './project';
import { TaskCard } from './task';
import { DocumentCard, DocumentListItem } from './document';

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
   *
   * @param type
   * @param itemId
   * @returns {React.Component}
   */
  renderCard(type, itemId) {
    console.assert(type && itemId);
    let spec = this._types.get(type);
    return spec && spec.renderCard(itemId) || <div>Invalid Card: { type }</div>;
  }

  /**
   *
   * @param type
   * @param itemId
   * @returns {XML}
   */
  renderCanvas(type, itemId) {
    console.assert(type && itemId);
    let spec = this._types.get(type);
    return spec && spec.renderCanvas(itemId) || <div>Invalid Canvas: { type }</div>;
  }

  /**
   * Optionally render a customized ListItem component.
   * @returns {React.Component}
   */
  // TODO(burdon): Replace with custom column or row.
  renderToListItem(type, item, onClick) {
    console.assert(type && item);
    let spec = this._types.get(type);
    return spec && spec.renderToListItem && spec.renderToListItem(item, onClick) || null;
  }

  icon(type) {
    let spec = this._types.get(type);
    return spec && spec.icon || '';
  }
}

/**
 * Class utility to create the TypeRegistry singleton.
 */
export const TypeRegistryDefs = new TypeRegistry([

  ['Board', {
    icon: 'view_column',
    renderCanvas: (itemId) => <BoardCard itemId={ itemId }/>
  }],

  ['Document', {
    icon: 'insert_drive_file',
    renderCard: (itemId) => <DocumentCard itemId={ itemId }/>,

    // TODO(burdon): Remove.
    renderToListItem: (item, onClick) => <DocumentListItem item={ item } />
  }],

  ['Group', {
    icon: 'group',
    renderCard: (itemId) => <TeamCard itemId={ itemId }/>
  }],

  ['Place', {
    icon: 'location_city',
    renderCard: (itemId) => <PlaceCard itemId={ itemId }/>
  }],

  ['Project', {
    icon: 'assignment',
    renderCard: (itemId) => <ProjectCard itemId={ itemId }/>
  }],

  ['Task', {
    icon: 'assignment_turned_in',
    renderCard: (itemId) => <TaskCard itemId={ itemId }/>
  }],

  ['User', {
    icon: 'accessibility',
    renderCard: (itemId) => <UserCard itemId={ itemId }/>
  }]

]);

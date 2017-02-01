//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { TypeRegistry } from './registry';

import { UserCard } from './user';
import { TeamCard } from './team';
import { PlaceCard } from './place';
import { ProjectCard, ProjectBoard } from './project';
import { TaskCard, TaskCompactCard } from './task';
import { DocumentCard, DocumentColumn } from './document';

/**
 * Class utility to create the TypeRegistry singleton.
 */
export const TypeRegistryFactory = () => new TypeRegistry([

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

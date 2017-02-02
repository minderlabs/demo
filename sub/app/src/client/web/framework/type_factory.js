//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { TypeRegistry } from '../framework/type_registry';

import { ContactCard, ContactCanvas } from '../type/contact';
import { DocumentColumn } from '../type/document';
//import { GroupCard } from '../type/group';
//import { ProjectCard } from '../type/project';
import { TaskCard } from '../type/task';
//import { UserCard } from '../type/user';

/**
 * Class utility to create the TypeRegistry singleton.
 */
export const TypeRegistryFactory = () => new TypeRegistry({

// ['Group', {
//   icon: 'group',
//   card: (itemId) => <TeamCard itemId={ itemId }/>,
// }],
//
//
// ['Project', {
//   icon: 'assignment',
//   card: (itemId) => <ProjectCard itemId={ itemId }/>,
//   canvas: {
//     def: (itemId) => <ProjectBoard itemId={ itemId } expand={ true }/>
//   }
// }],

// ['Task', {
//   icon: 'assignment_turned_in',
//   card: (item) => <TaskCard item={ item }/>,
//   canvas: {
//     def: (itemId) => <TaskCanvas itemId={ itemId } expand={ true }/>
//   }
// }],

// ['User', {
//   icon: 'accessibility',
//   card: (itemId) => <UserCard itemId={ itemId }/>
// }]

  Contact: {
    icon: 'contacts',
    card: (item) => <ContactCard item={ item }/>,
    canvas: {
      def: (itemId) => <ContactCanvas itemId={ itemId }/>
    }
  },

  Document: {
    icon: 'insert_drive_file',
    column: (item) => <DocumentColumn item={ item }/>
  },

  Task: {
    icon: 'assignment_turned_in',
    card: (item) => <TaskCard item={ item }/>
  }

});

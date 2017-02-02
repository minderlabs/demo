//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { TypeRegistry } from '../framework/type_registry';

import { ContactCard, ContactCanvas } from './contact';
import { DocumentColumn } from './document';

// import { UserCard } from './user';
// import { TeamCard } from './team';
// import { PlaceCard } from './place';
// import { ProjectCard, ProjectBoard } from './project';
// import { TaskCard, TaskCompactCard } from './task';

/**
 * Class utility to create the TypeRegistry singleton.
 */
export const TypeRegistryFactory = () => new TypeRegistry({

/*['Document', {*/
//   icon: 'insert_drive_file',
//   card: (itemId) => <DocumentCard itemId={ itemId }/>,
//   column: (item) => <DocumentColumn item={ item }/>
// }],
//
// ['Group', {
//   icon: 'group',
//   card: (itemId) => <TeamCard itemId={ itemId }/>,
// }],
//
// ['Place', {
//   icon: 'location_city',
//   card: (itemId) => <PlaceCard itemId={ itemId }/>,
// }],
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
  }

});

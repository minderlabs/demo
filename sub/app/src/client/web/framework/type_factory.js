//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { TypeRegistry } from '../framework/type_registry';

import { ItemCard, ItemCanvas } from '../type/item';

import { ContactCard, ContactCanvas } from '../type/contact';
import { DocumentColumn } from '../type/document';
import { GroupCanvas } from '../type/group';
import { ProjectCard, ProjectBoardCanvas } from '../type/project';
import { TaskCard, TaskCanvas } from '../type/task';
import { UserCanvas } from '../type/user';

/**
 * Class utility to create the TypeRegistry singleton.
 */
export const TypeRegistryFactory = () => new TypeRegistry({

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

  Group: {
    icon: 'group',
    canvas: {
      def: (itemId) => <GroupCanvas itemId={ itemId }/>
    }
  },

  Project: {
    icon: 'assignment',
    card: (item) => <ProjectCard item={ item }/>,
    canvas: {
      def: (itemId) => <ProjectBoardCanvas itemId={ itemId }/>
    }
  },

  Task: {
    icon: 'assignment_turned_in',
    card: (item) => <TaskCard item={ item }/>,
    canvas: {
      def: (itemId) => <TaskCanvas itemId={ itemId }/>
    }
  },

  User: {
    icon: 'accessibility',
    canvas: {
      def: (itemId) => <UserCanvas itemId={ itemId }/>
    }
  }

});

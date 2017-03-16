//
// Copyright 2016 Minder Labs.
//

import { expect } from 'chai';

import { Database } from './database';
import { IdGenerator } from './id';
import { ItemUtil } from './item_store';
import { Matcher } from './matcher';
import { MemoryItemStore } from './memory_item_store';

const matcher = new Matcher();

//
// Database.
// TODO(burdon): Test both databases.
//

const idGenerator = new IdGenerator(1000);

const tests = (itemStore) => {

  let database = new Database()
    .registerItemStore(itemStore);

  it('Groups items.', () => {
    let items = [
      {
        id: 'I-1',
        type: 'Task',
        title: 'Task 1',
        project: 'project-1'
      },
      {
        id: 'I-2',
        type: 'Task',
        title: 'Task 2'
      },
      {
        id: 'I-3',
        type: 'Note',
        title: 'Note 1'
      },
      {
        id: 'project-1',
        type: 'Project',
        title: 'Project 1'
      },
      {
        id: 'I-4',
        type: 'Task',
        title: 'Task 3',
        project: 'project-1'
      },
      {
        id: 'I-5',
        type: 'Task',
        title: 'Task 4',
        project: 'project-2'
      },
      {
        id: 'I-6',
        type: 'Task',
        title: 'Task 5',
        project: 'project-3'
      },
      {
        id: 'I-7',
        type: 'Task',
        title: 'Task 6',
        project: 'project-3'
      }
    ];

    // TODO(madadam): TypeUtil or TypeRegistry.
    const getGroupKey = item => {
      switch (item.type) {
        case 'Task': {
          return item.project;
        }
      }
    };

    let groupedItems = ItemUtil.groupBy(items, getGroupKey);

    expect(groupedItems).to.have.lengthOf(6);
    expect(groupedItems[0].id).to.equal('project-1');
    expect(groupedItems[0].title).to.equal('Project 1');
    expect(groupedItems[0].refs).to.have.lengthOf(2);
  });
};

describe('MemoryDatabase:',
  () => tests(new MemoryItemStore(idGenerator, matcher, 'test')));

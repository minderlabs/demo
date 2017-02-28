//
// Copyright 2016 Minder Labs.
//

// TODO(burdon): Not running karma/webpack.
const expect = require('chai').expect;

import { IdGenerator, ItemUtil, Matcher } from 'minder-core';

import { Database } from './database';

const matcher = new Matcher();

//
// Database.
// TODO(burdon): Test both databases.
//

const idGenerator = new IdGenerator(1000);

const tests = (itemStore) => {

  let database = new Database()
    .registerItemStore(itemStore);

  it('Create and get items.', (done) => {
    let context = {};

    // TODO(burdon): Test ID.
    database.getItemStore().upsertItems(context, [{ type: 'User', title: 'Minder' }]).then(items => {
      expect(items).to.exist;
      expect(items.length).to.equal(1);

      database.getItemStore().getItem(context, 'User', items[0].id).then(item => {
        expect(item.title).to.equal('Minder');
        done();
      });
    });
  });

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

    let groupedItems = ItemUtil.groupBy(items);

    expect(groupedItems).to.have.lengthOf(6);
    expect(groupedItems[0].id).to.equal('project-1');
    expect(groupedItems[0].title).to.equal('Project 1');
    expect(groupedItems[0].refs).to.have.lengthOf(2);
  });
};

/*
describe('MemoryDatabase:',
  () => tests(new MemoryItemStore(idGenerator, matcher, 'test')));

describe('RedisDatabase:',
  () => tests(new RedisItemStore(fakeredis.createClient(), matcher)));
*/

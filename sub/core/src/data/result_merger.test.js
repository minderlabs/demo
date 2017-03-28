//
// Copyright 2017 Minder Labs.
//

import { expect } from 'chai';

import { Database, ResultMerger } from './database';
import { IdGenerator } from './id';
import { Matcher } from './matcher';
import { MemoryItemStore } from './memory_item_store';

const matcher = new Matcher();

//
// ResultMerger
//

const idGenerator = new IdGenerator(1000);

describe('ResultMerger:', () => {

  let queryProcessors = new Map();
  let context = {};

  function initQueryProcessor(namespace, items) {
    let itemStore = new MemoryItemStore(idGenerator, matcher, namespace, false);
    queryProcessors.set(namespace, itemStore);
    return itemStore.upsertItems(context, items)
      .then(() => {
        return queryProcessors;
      });
  }

  let resultMerger = new ResultMerger(queryProcessors);

  it('Does not merge results without matching keys', (done) => {

    let results = [
      {
        namespace: Database.NAMESPACE.USER,
        items: [
          {
            id: 'I-1',
            type: 'Task',
            title: 'Task 1',
            project: 'project-1'          // project-1
          }
        ]
      },
      {
        namespace: 'test_namespace_1',
        items: [
          {
            id: 'I-2',
            type: 'Task',
            title: 'Task 1',
            project: 'project-1'          // project-1
          }
        ]
      }
    ];

    resultMerger.mergeResults(results)
      .then(items => {
        expect(items).to.have.lengthOf(2);
        done();
      });
  });

  it('Merges results with matching foreign keys', (done) => {

    let results = [
      {
        namespace: Database.NAMESPACE.USER,
        items: [
          {
            id: 'I-1',
            type: 'Task',
            title: 'Task 1',
            fkey: 'test.com/foreign_key_1'
          }
        ]
      },
      {
        namespace: 'test.com',
        items: [
          {
            id: 'foreign_key_1',
            namespace: 'test.com',
            type: 'Task',
            title: 'Task 1',
            project: 'project-1'          // project-1
          }
        ]
      }
    ];

    initQueryProcessor(Database.NAMESPACE.USER, [])
      .then(() => {
        resultMerger.mergeResults(results)
          .then(items => {
            expect(items).to.have.lengthOf(1);
            expect(_.get(items[0], 'project')).to.equal('project-1');
            done();
          });
      });
  });

  it('Does NOT merges user-space result with User store', (done) => {

    // We don't need to merge in this case -- if there's a USER-namespace result, presumably it's
    // complete and we don't need to re-fetch the item from the UserStore.

    let results = [
      {
        namespace: Database.NAMESPACE.USER,
        items: [
          {
            id: 'I-1',
            type: 'Task',
            title: 'Task 1',
            fkey: 'test.com/foreign_key_1'
          }
        ]
      }
    ];

    initQueryProcessor(Database.NAMESPACE.USER,
      [
        {
          id: 'I-1',
          type: 'Task',
          title: 'Task 1',
          fkey: 'test.com/foreign_key_1',
          project: 'project-1'          // Extra info not in the result.
        }
      ])
      .then(() => {
        resultMerger.mergeResults(results)
          .then(items => {
            expect(items).to.have.lengthOf(1);
            // Extra info is NOT merged.
            expect(_.get(items[0], 'project')).to.equal(undefined);
            done();
          });
      });
  });

  it('Merges external result with User store', (done) => {

    let results = [
      {
        namespace: 'test.com',
        items: [
          {
            id: 'foreign_key_1',
            namespace: 'test.com',
            type: 'Task',
            title: 'Task 1',
          }
        ]
      }
    ];

    initQueryProcessor(Database.NAMESPACE.USER,
      [
        {
          id: 'I-1',
          type: 'Task',
          title: 'Task 1',
          fkey: 'test.com/foreign_key_1',
          project: 'project-1'          // Extra info not in the result.
        }
      ])
      .then(() => {
        resultMerger.mergeResults(results)
          .then(items => {
            expect(items).to.have.lengthOf(1);
            expect(_.get(items[0], 'project')).to.equal('project-1');
            done();
          });
      });
  });

  it('Merges results from 3 sources', (done) => {

    let results = [
      {
        namespace: Database.NAMESPACE.USER,
        items: [
          {
            id: 'I-1',
            type: 'Task',
            title: 'Task 1',
            fkey: 'test.com/foreign_key_1'
          }
        ]
      },
      {
        namespace: 'test.com',
        items: [
          {
            id: 'foreign_key_1',
            namespace: 'test.com',
            type: 'Task',
            title: 'Task 1',
            project: 'project-1'          // project-1
          }
        ]
      }
    ];

    initQueryProcessor(Database.NAMESPACE.USER,
      [
        {
          id: 'I-1',
          type: 'Task',
          title: 'Task 1',
          fkey: 'test.com/foreign_key_1',
          description: 'A task'         // Extra info not in the results.
        }
      ])
      .then(() => {
        resultMerger.mergeResults(results)
          .then(items => {
            expect(items).to.have.lengthOf(1);
            expect(_.get(items[0], 'project')).to.equal('project-1');
            expect(_.get(items[0], 'description')).to.equal('A task');
            // TODO(madadam): another test w/ conflicting fields, which wins (store or external result)?
            done();
          });
      });
  });

  it('Keeps external results that have no matching foreign key', (done) => {

    let results = [
      {
        namespace: Database.NAMESPACE.USER,
        items: [
          {
            id: 'I-1',
            type: 'Task',
            title: 'Task 1',
            fkey: 'test.com/foreign_key_1'
          }
        ]
      },
      {
        namespace: 'test.com',
        items: [
          {
            id: 'foreign_key_1',
            namespace: 'test.com',
            type: 'Task',
            title: 'Task 1',
            project: 'project-1'          // project-1
          },
          {
            id: 'foreign_key_2',
            namespace: 'test.com',
            type: 'Task',
            title: 'Task 2'
          }
        ]
      }
    ];

    initQueryProcessor(Database.NAMESPACE.USER,
      [
        {
          id: 'I-1',
          type: 'Task',
          title: 'Task 1',
          fkey: 'test.com/foreign_key_1',
          project: 'project-1'          // Extra info not in the result.
        }
      ])
      .then(() => {
        resultMerger.mergeResults(results)
          .then(items => {
            expect(items).to.have.lengthOf(2);
            done();
          });
      });
  });
});


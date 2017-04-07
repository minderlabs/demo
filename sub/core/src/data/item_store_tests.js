//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

/**
 * Standard tests for all ItemStore implementations
 *
 * @param expect Chai expect (This module is exported so do not import chai.)
 * @param storeFactory
 */
export const ItemStoreTests = (expect, storeFactory, buckets=true) => {

  it('Stores and retrieves items.', (done) => {
    storeFactory().then(itemStore => {

      let context = {
        buckets: buckets ? ['test-bucket']: []
      };

      let root = {};

      const createItem = (bucket, type, title) => {
        let item = {
          type, title
        };

        if (bucket) {
          item.bucket = bucket;
        }

        return item;
      };

      let items = [
        createItem(buckets && 'test-bucket', 'Task', 'Task-1'),
        createItem(buckets && 'test-bucket', 'Task', 'Task-2'),
        createItem(buckets && 'test-bucket', 'Task', 'Task-3')
      ];

      // Write items.
      itemStore.upsertItems(context, items)

        //
        // Look-up by filter.
        //
        .then(upsertedItems => {
          expect(upsertedItems).to.have.lengthOf(items.length);
          let filter = {
            type: 'Task'
          };

          return itemStore.queryItems(context, root, filter).then(matchedItems => {
            expect(matchedItems).to.have.lengthOf(upsertedItems.length);
            return upsertedItems;
          });
        })

        //
        // Look-up by ID.
        //
        .then(upsertedItems => {
          expect(upsertedItems).to.have.lengthOf(items.length);
          let itemIds = _.map(upsertedItems, item => item.id);

          return itemStore.getItems(context, 'Task', itemIds).then(matchedItems => {
            expect(matchedItems).to.have.lengthOf(items.length);
            return upsertedItems;
          });
        })

        //
        // Test.
        //
        .then(upsertedItems => {
          expect(upsertedItems).to.have.lengthOf(items.length);
          done();
        });
    });
  });
};

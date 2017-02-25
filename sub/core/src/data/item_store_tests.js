//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

const expect = require('chai').expect;

/**
 * Standard tests for all ItemStore implementations
 * @param storeFactory
 */
export const ItemStoreTests = storeFactory => {

  it('Stores and retrieves items.', (done) => {
    storeFactory().then(itemStore => {

      // TODO(burdon): Test user and group bucket.
      let context = {
        groupId: 'test-bucket'
      };

      let root = {};

      let items = [
        {
          bucket: 'test-bucket',
          id: 'test-1',
          type: 'Test',
          title: 'Test-1'
        },
        {
          bucket: 'test-bucket',
          type: 'Test',
          title: 'Test-2'
        },
        {
          bucket: 'test-bucket',
          type: 'Test',
          title: 'Test-3'
        }
      ];

      // Write items.
      itemStore.upsertItems(context, items)

        //
        // Look-up by filter.
        //
        .then(upsertedItems => {
          expect(upsertedItems).to.have.lengthOf(items.length);
          let filter = {
            type: 'Test'
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

          return itemStore.getItems(context, 'Test', itemIds).then(matchedItems => {
            expect(matchedItems).to.have.lengthOf(items.length);
            return upsertedItems;
          });
        })

        .then(upsertedItems => {
          expect(upsertedItems).to.have.lengthOf(items.length);
          done();
        });
    });
  });
};
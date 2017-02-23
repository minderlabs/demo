//
// Copyright 2017 Minder Labs.
//

// TODO(burdon): Reuses tests for any store.
import { IdGenerator } from './id';
import { Matcher } from './matcher';
import { MemoryItemStore } from './memory_item_store';

describe('ItemStore:', () => {

  let idGenerator = new IdGenerator(1000);
  let matcher = new Matcher();

  function getStore() {
    return new MemoryItemStore(idGenerator, matcher);
  }

  it('Stores and retrieves items.', (done) => {
    let itemStore = getStore();

    let context = {};
    let root = {};

    let items = [
      {
        id: 'test-1',
        type: 'Test',
        title: 'Test-1'
      },
      {
        type: 'Test',
        title: 'Test-2'
      },
      {
        type: 'Test',
        title: 'Test-3'
      }
    ];

    // Write items.
    itemStore.upsertItems(context, items)
      .then(updatedItems => {
        // Look-up by filter.
        let filter = {
          type: 'Test'
        };

        return itemStore.queryItems(context, root, filter).then(matchedItems => {
          expect(matchedItems).to.have.lengthOf(updatedItems.length);
          return updatedItems;
        });
      })
      .then(updatedItems => {
        // Look-up by ID.
        let itemIds = _.map(updatedItems, item => item.id);

        return itemStore.getItems(context, 'Test', itemIds).then(matchedItems => {
          expect(matchedItems).to.have.lengthOf(items.length);
          return updatedItems;
        });
      })
      .then(updatedItems => {
        done();
      });
  });
});

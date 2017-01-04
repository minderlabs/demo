//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';

import { ItemReducer, ListReducer } from './reducer';

import { UpdateItemMutation } from './mutations';
import { Matcher } from './matcher';

const TestListQuery = gql`
  query TestListQuery {
    items {
      id
      title
    }
  }
`;

// TODO(burdon): Implement more complex shape (see project).
// TODO(burdon): Test if inserted into multiple paths.
const TestItemQuery = gql`
  query TestItemQuery {
    item {
      id
      project {
        items {
          id
          title
        }
      }
    }
  }
`;

const TestItemMutation = gql`
  mutation TestMutation($itemId: ID!, $mutations: [ObjectMutationInput]!) {
    updateItem(itemId: $itemId, mutations: $mutations) {
      id
      title
    }
  }
`;

const Items = [
  {
    id: 'I-1',
    type: 'Test',
    labels: ['_favorite'],
    title: 'Item 1'
  },
  {
    id: 'I-2',
    type: 'Test',
    labels: ['_favorite'],
    title: 'Item 2'
  },
  {
    id: 'I-3',
    type: 'Test',
    labels: ['_favorite'],
    title: 'Item 3'
  }
];

const CachedItems = {
  items: Items
};

const CachedItem = {
  item: {
    id: 'X-1',

    project: {
      items: Items
    }
  }
};

describe('Reducers:', () => {

  const filter = {
    type: 'Test',
    labels: ['_favorite']
  };

  const listReducer = new ListReducer({
    mutation: {
      type: TestItemMutation,
      path: 'updateItem'
    },
    query: {
      type: TestListQuery,
      path: 'items'
    }
  });

  const itemReducer = new ItemReducer({
    mutation: {
      type: TestItemMutation,
      path: 'updateItem'
    },
    query: {
      type: TestItemQuery,
      path: 'item'
    }
  }, (matcher, context, previousResult, item) => {
    let match = matcher.matchItem(context, {}, filter, item);

    let idx = _.findIndex(_.get(previousResult, 'item.project.items'), i => i.id == item.id);

    // Ignore if matches and already exists.
    let change = (match && idx == -1) || (!match && idx != -1);
    return change && {
      item: {
        project: {
          items: {
            $apply: (items) => {
              if (idx == -1) {
                // Insert.
                return [...items, item];
              } else {
                // Remove.
                return _.filter(items, i => i.id != item.id);
              }
            }
          }
        }
      }
    }
  });

  const context = {};

  const matcher = new Matcher();

  it('Inserts an item into list.', () => {

    let updatedItem = {
      id: 'I-4',
      type: 'Test',
      labels: ['_favorite'],
      title: 'Item 4'
    };

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: TestItemMutation.definitions[0].name.value,
      result: {
        data: {
          updateItem: updatedItem
        }
      }
    };

    let previousResult = CachedItems;

    let result = listReducer.reduceItems(matcher, context, filter, previousResult, action);

    // Test was appended.
    expect(result.items.length).to.equal(previousResult.items.length + 1);
    expect(result.items[3].id).to.equal(updatedItem.id);
  });

  it('Removes an item from list.', () => {

    let updatedItem = {
      id: 'I-2',
      type: 'Test',
      title: 'Item 2'
    };

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: TestItemMutation.definitions[0].name.value,
      result: {
        data: {
          updateItem: updatedItem
        }
      }
    };

    let previousResult = CachedItems;

    let result = listReducer.reduceItems(matcher, context, filter, previousResult, action);

    // Test was removed.
    expect(result.items.length).to.equal(previousResult.items.length - 1);
  });

  it('Inserts the item into a nested list within the cached item.', () => {

    let updatedItem = {
      id: 'I-4',
      type: 'Test',
      labels: ['_favorite'],
      title: 'Item 4'
    };

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: TestItemMutation.definitions[0].name.value,
      result: {
        data: {
          updateItem: updatedItem
        }
      }
    };

    let previousResult = CachedItem;

    let result = itemReducer.reduceItem(matcher, context, previousResult, action);

    let path = 'item.project.items';
    expect(_.get(result, path).length).to.equal(_.get(previousResult, path).length + 1);
  });

  it('Removed the item from a nested list within the cached item.', () => {

    let updatedItem = {
      id: 'I-3',
      type: 'Test',
      title: 'Item 3'
    };

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: TestItemMutation.definitions[0].name.value,
      result: {
        data: {
          updateItem: updatedItem
        }
      }
    };

    let previousResult = CachedItem;

    let result = itemReducer.reduceItem(matcher, context, previousResult, action);

    let path = 'item.project.items';
    expect(_.get(result, path).length).to.equal(_.get(previousResult, path).length - 1);
  });

  it('Ignore modified items', () => {

    let updatedItem = {
      id: 'I-3',
      type: 'Test',
      labels: ['_favorite'],
      title: 'Item 3-a'
    };

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: TestItemMutation.definitions[0].name.value,
      result: {
        data: {
          updateItem: updatedItem
        }
      }
    };

    // List.
    {
      let previousResult = CachedItems;
      let listResult = listReducer.reduceItems(matcher, context, filter, previousResult, action);

      expect(listResult.items.length).to.equal(previousResult.items.length);
    }

    // Item.
    {
      let previousResult = CachedItem;
      let itemResult = itemReducer.reduceItem(matcher, context, previousResult, action);

      let path = 'item.project.items';
      expect(_.get(itemResult, path).length).to.equal(_.get(previousResult, path).length);
    }
  });
});
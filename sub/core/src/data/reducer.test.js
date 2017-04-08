//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';

import { UpsertItemsMutationName } from './mutations';
import { ItemReducer, ListReducer } from './reducer';
import { Matcher } from './matcher';

const TestListQuery = gql`
  query TestListQuery($filter: FilterInput!) {
    search(filter: $filter) {
      items {
        id
        title
      }
    }
  }
`;

const TestItemQuery = gql`
  query TestItemQuery($itemId: ID!) {
    item(itemId: $itemId) {
      id
      ... on Task {
        project {
          tasks {
            id
            title
          }
        }
      }
    }
  }
`;

const Items = [
  {
    id: 'I-1',
    type: 'Task',
    labels: ['_favorite'],
    title: 'Item 1'
  },
  {
    id: 'I-2',
    type: 'Task',
    labels: ['_favorite'],
    title: 'Item 2'
  },
  {
    id: 'I-3',
    type: 'Task',
    labels: ['_favorite'],
    title: 'Item 3'
  }
];

const TestListQueryResult = {

  search: {
    items: Items
  }
};

const TestItemQueryResult = {

  item: {
    id: 'X-1',

    project: {
      tasks: Items
    }
  }
};

describe('Reducers:', () => {

  const context = {};

  const matcher = new Matcher();

  //
  // Operations based on filter.
  //

  const filter = {
    type: 'Task',
    labels: ['_favorite']
  };

  const listReducer = new ListReducer(TestListQuery, null, 'items');

  //
  // ListReducer.
  //

  it('Inserts an item into list.', () => {

    let upsertItems = [{
      id: 'I-4',
      type: 'Task',
      labels: ['_favorite'],
      title: 'Item 4'
    }];

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: UpsertItemsMutationName,
      result: {
        data: {
          upsertItems
        }
      }
    };

    let previousResult = TestListQueryResult;

    let result = listReducer.reduceItems(matcher, context, filter, previousResult, action);

    // Test was appended.
    expect(result.search.items.length).to.equal(previousResult.search.items.length + 1);
    expect(result.search.items[3].id).to.equal(upsertItems[0].id);
  });

  it('Removes an item from list.', () => {

    let upsertItems = [{
      id: 'I-2',
      type: 'Task',
      title: 'Item 2'
    }];

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: UpsertItemsMutationName,
      result: {
        data: {
          upsertItems
        }
      }
    };

    let previousResult = TestListQueryResult;

    let result = listReducer.reduceItems(matcher, context, filter, previousResult, action);

    // Test was removed.
    expect(result.search.items.length).to.equal(previousResult.search.items.length - 1);
  });

  //
  // ItemReducer
  //

  const itemReducer = new ItemReducer(TestItemQuery, (matcher, context, previousResult, item) => {
    let match = matcher.matchItem(context, {}, filter, item);

    // Ignore if matches and already exists.
    let idx = _.findIndex(_.get(previousResult, 'item.project.tasks'), i => i.id === item.id);
    let change = (match && idx === -1) || (!match && idx !== -1);
    return change && {
      item: {
        project: {
          tasks: {
            $apply: (items) => {
              if (idx === -1) {
                // Insert.
                return [...items, item];
              } else {
                // Remove.
                return _.filter(items, i => i.id !== item.id);
              }
            }
          }
        }
      }
    };
  });

  it('Inserts the item into a nested list within the cached item.', () => {

    let upsertItems = [{
      id: 'I-4',
      type: 'Task',
      labels: ['_favorite'],
      title: 'Item 4'
    }];

    let action = {
      type: 'APOLLO_MUTATION_RESULT',
      operationName: UpsertItemsMutationName,
      result: {
        data: {
          upsertItems
        }
      }
    };

    let previousResult = TestItemQueryResult;

    let result = itemReducer.reduceItem(matcher, context, previousResult, action);

    let path = 'item.project.tasks';
    expect(_.get(result, path).length).to.equal(_.get(previousResult, path).length + 1);
  });
});

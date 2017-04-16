//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';

import { UpsertItemsMutationName } from './mutations';
import { Reducer, ListReducer } from './reducer';
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

  const listReducer = Reducer.callback(new ListReducer('search.items'), { matcher, context, filter });

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

    let result = listReducer(previousResult, action);

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

    let result = listReducer(previousResult, action);

    // Test was removed.
    expect(result.search.items.length).to.equal(previousResult.search.items.length - 1);
  });

  //
  // ItemReducer
  //

  class TestItemReducer extends Reducer {

    constructor() {
      super();
      this._taskListReducer = new ListReducer('item.project.tasks');
    }

    applyMutations(props, previousResult, updatedItems) {
      let updateSpec = this._taskListReducer.createUpdateSpec(props, previousResult, updatedItems);
      return this.update(previousResult, updateSpec);
    }
  }

  const itemReducer = Reducer.callback(new TestItemReducer(), { matcher, context, filter });

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

    let result = itemReducer(previousResult, action);

    let path = 'item.project.tasks';
    expect(_.get(result, path).length).to.equal(_.get(previousResult, path).length + 1);
  });
});

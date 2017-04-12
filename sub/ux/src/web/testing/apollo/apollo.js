//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { createMemoryHistory, Route, Router } from 'react-router';
import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import thunk from 'redux-thunk';
import { routerMiddleware, routerReducer } from 'react-router-redux'
import { graphql, ApolloProvider } from 'react-apollo';
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import update from 'immutability-helper';

import { ItemUtil, MutationUtil, Transforms, TypeUtil } from 'minder-core';

import { ReactUtil } from '../../react';

import './apollo.less';

export const ID = type => type + '/' + _.uniqueId('I-');

//-------------------------------------------------------------------------------------------------
// React Components.
//-------------------------------------------------------------------------------------------------

class ListComponent extends React.Component {

  count = 0;

  constructor() {
    super(...arguments);

    this.state = {
      text: '',
      items: _.map(this.props.items, item => _.clone(item))
    }
  }

  // TODO(burdon): Dispatch redux action.

  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps:', TypeUtil.stringify(nextProps));
    this.setState({
      items: _.map(nextProps.items, item => _.clone(item))
    });
  }

  handleTextChange(event) {
    let { items } = this.state;
    let itemMap = ItemUtil.createItemMap(items);
    let itemId = $(event.target).attr('data');
    let item = itemMap.get(itemId);

    if (item) {
      item.title = event.target.value;
      this.forceUpdate();
    } else {
      this.setState({
        text: event.target.value
      });
    }
  }

  handleUpdate(item, event) {
    let { updateItem } = this.props;
    let input = this.refs['INPUT/' + item.id];
    let text = $(input).val();
    if (text) {
      updateItem(item, [
        MutationUtil.createFieldMutation('title', 'string', text)
      ]);
    }

    input.focus();
  }

  handleInsert(event) {
    let { insertItem } = this.props;
    let { text } = this.state;
    if (text) {
      insertItem('Task', [
        MutationUtil.createFieldMutation('title', 'string', text)
      ]);

      this.setState({
        text: ''
      });
    }

    this.refs['INPUT_NEW'].focus();
  }

  handleRefetch() {
    this.props.refetch();
  }

  render() {
    return ReactUtil.render(this, (props) => {
      let { items, text } = this.state;

      console.log('RootComponent.render', _.size(items));
      return (
        <div className="test-component">
          <div>Result[{ ++this.count }]</div>

          <div className="test-list">
            {_.map(items, item => (
              <div key={ item.id }>
                <input ref={ 'INPUT/' + item.id } type="text" data={ item.id } value={ item.title } spellCheck={ false }
                       onChange={ this.handleTextChange.bind(this) }/>

                <i className="material-icons" onClick={ this.handleUpdate.bind(this, item) }>save</i>
              </div>
            ))}

            <div>
              <input ref="INPUT_NEW" type="text" value={ text } autoFocus={ true } spellCheck={ false }
                     onChange={ this.handleTextChange.bind(this) }/>

              <i className="material-icons" onClick={ this.handleInsert.bind(this) }>add</i>
            </div>
          </div>

          <div>
            <button onClick={ this.handleRefetch.bind(this) }>Refetch</button>
          </div>
        </div>
      );
    });
  }
}

class SimpleListComponent extends React.Component {

  render() {
    return ReactUtil.render(this, (props) => {
      let { items } = props;

      return (
        <div className="test-component">
          {_.map(items, item => (
            <div key={ item.id }>{ item.title }</div>
          ))}
        </div>
      );
    });
  }
}

class OptionsComponent extends React.Component {

  handleOptionsUpdate(param, event) {
    this.props.updateOptions(param, event.target.checked);
  }

  render() {
    let { options={} } = this.props;
    let { listReducer, optimisticResponse, networkDelay } = options;

    return (
      <div className="test-component">
        <div>
          <label>
            <input type="checkbox" onChange={ this.handleOptionsUpdate.bind(this, 'listReducer') }
                   checked={ listReducer }/> List Reducer.
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" onChange={ this.handleOptionsUpdate.bind(this, 'optimisticResponse') }
                   checked={ optimisticResponse }/> Optimistic responses.
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" onChange={ this.handleOptionsUpdate.bind(this, 'networkDelay') }
                   checked={ networkDelay }/> Network Delay.
          </label>
        </div>
      </div>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// Redux Container.
// https://github.com/reactjs/react-redux/blob/master/docs/api.md
//-------------------------------------------------------------------------------------------------

// TODO(burdon): Read from cache.
// http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.readQuery

const mapStateToProps = (state, ownProps) => {
  let { options } = AppState(state);
  return {
    options
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    updateOptions: (param, value) => {
      dispatch(AppUpdateOptions({
        [param]: value
      }));
    }
  };
};

const OptionsComponentWithRedux = connect(mapStateToProps, mapDispatchToProps)(OptionsComponent);

//-------------------------------------------------------------------------------------------------
// GQL Queries and Mutations.
//-------------------------------------------------------------------------------------------------

export const TestQuery = gql`
  query TestQuery($filter: FilterInput) {
    search(filter: $filter) {
      items {
        type
        id
        title
      }
    }
  }
`;

const TestQueryName = _.get(TestQuery, 'definitions[0].name.value');

export const TestMutation = gql`
  mutation UpsertItemsMutation($mutations: [ItemMutationInput]!) {
    upsertItems(mutations: $mutations) {
      type
      id
      title
    }
  }
`;

const TestMutationName = _.get(TestMutation, 'definitions[0].name.value');

//-------------------------------------------------------------------------------------------------
// Updating the Cache.
// http://dev.apollodata.com/react/cache-updates.html
// NOTE: Cache normalization ensures that items returned from the mutation (that must include
// the __typname attribute) correctly updates the cache (and automatically updates all queries).
//
// 1). Refetch queries on mutation.
// http://dev.apollodata.com/react/cache-updates.html#refetchQueries
// - mutate({ refetchQueries: [{ query, variables }] })
//
// 2). Add/remove items after mutation (updates should happen automatically via cache normalization).
// http://dev.apollodata.com/react/cache-updates.html#updateQueries
// - mutate({ updateQueries: { Type: (previousResult, { mutationResult }) => {} })
//
// 3). Update query result based on mutation.
// http://dev.apollodata.com/react/cache-updates.html#resultReducers
// - graphql({ options: { reducer: (previousResult, action, variables) => {} } })
//
//-------------------------------------------------------------------------------------------------

const ListReducer = (query, path, active=true) => (previousResult, action, variables) => {

  // Isolate mutations.
  if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === TestMutationName && active) {
    let { upsertItems } = action.result.data;
    let currentItems = _.get(previousResult, path);

    // Append.
    // TODO(burdon): Sort order.
    // TODO(burdon): Test for removal (matcher).
    let appendItems =
      _.filter(upsertItems, item => !_.find(currentItems, currentItem => currentItem.id === item.id));

    // https://github.com/kolodny/immutability-helper
    let tranform = _.set({}, path, {
      $push: appendItems
    });

    return update(previousResult, tranform);
  }

  return previousResult
};

//-------------------------------------------------------------------------------------------------
// Optimistic Updates.
// http://dev.apollodata.com/react/optimistic-ui.html
// http://dev.apollodata.com/react/api-mutations.html#graphql-mutation-options-optimisticResponse
//-------------------------------------------------------------------------------------------------

const OptimisticResponse = (item, mutations) => {

  let updatedItem = Transforms.applyObjectMutations(item, mutations);
  _.assign(updatedItem, {
    __typename: item.type
  });

  return {
    upsertItems: [updatedItem]
  };
};

//-------------------------------------------------------------------------------------------------
// Apollo Container.
// http://dev.apollodata.com/react/api-queries.html
//-------------------------------------------------------------------------------------------------

const ListComponentWithApollo = compose(

  connect((state, ownProps) => {
    let { options } = AppState(state);
    return {
      options
    };
  }),

  // http://dev.apollodata.com/react/queries.html
  graphql(TestQuery, {

    // http://dev.apollodata.com/react/queries.html#graphql-options
    options: (props) => {
      let { options } = props;
      console.log('graphql.options:', TestQueryName);

      return {
        variables: {
          filter: { Type: 'Task' }
        },

        // http://dev.apollodata.com/react/api-queries.html#graphql-config-options-fetchPolicy
//      fetchPolicy: 'network-only',

        // http://dev.apollodata.com/react/cache-updates.html#resultReducers
        reducer: ListReducer(TestQuery, 'search.items', options.listReducer)
      };
    },

    // http://dev.apollodata.com/react/api-queries.html#graphql-query-options
    // http://dev.apollodata.com/react/queries.html#graphql-skip

    // http://dev.apollodata.com/react/queries.html#graphql-props-option
    props: ({ ownProps, data }) => {
      let { errors, loading, search } = data;
      let items = _.get(search, 'items');
      console.log('graphql.props:', TestQueryName, loading ? 'loading...' : JSON.stringify(search));

      // TODO(burdon): updateQuery.
      // Decouple Apollo query/result from component.
      return {
        errors,
        loading,

        items,

        refetch: () => {
          // NOTE: Doesn't trigger re-render (i.e., HOC observer) unless results change.
          data.refetch();
        }
      };
    }
  }),

  // http://dev.apollodata.com/react/mutations.html
  graphql(TestMutation, {

    // http://dev.apollodata.com/react/mutations.html#custom-arguments
    props: ({ ownProps, mutate }) => ({

      //
      // Insert item.
      //
      updateItem: (item, mutations) => {
        let itemId = item.id;

        let optimisticResponse =
          ownProps.options.optimisticResponse && OptimisticResponse(item, mutations);

        return mutate({
          variables: {
            mutations: [
              {
                itemId,
                mutations
              }
            ]
          },

          optimisticResponse
        });
      },

      //
      // Insert item.
      //
      insertItem: (type, mutations) => {
        let itemId = ID(type);

        // http://dev.apollodata.com/react/optimistic-ui.html
        // http://dev.apollodata.com/react/api-mutations.html#graphql-mutation-options-optimisticResponse
        let optimisticResponse =
          ownProps.options.optimisticResponse && OptimisticResponse({ type, id: itemId }, mutations);

        return mutate({
          variables: {
            mutations: [
              {
                itemId,
                mutations
              }
            ]
          },

          optimisticResponse
        });
      }
    })
  })

)(ListComponent);

const SimpleListComponentWithApollo = compose(

  // http://dev.apollodata.com/react/queries.html
  graphql(TestQuery, {

    options: (props) => {
      return {
        reducer: ListReducer(TestQuery, 'search.items')
      }
    },

    props: ({ ownProps, data }) => {
      let { errors, loading, search } = data;
      let items = _.get(search, 'items');

      return {
        errors,
        loading,
        items
      }
    }
  })

)(SimpleListComponent);

//-------------------------------------------------------------------------------------------------
// Test Server.
//-------------------------------------------------------------------------------------------------

const ITEMS = _.times(5, i => ({
  type: 'Task',
  id: ID('Task'),
  title: 'Task ' + (i + 1)
}));

class Database {

  queryItems() {
    return Promise.resolve(ITEMS);
  }

  upsertItems(items) {
    let itemMap = ItemUtil.createItemMap(ITEMS);
    _.each(items, item => {
      let existing = itemMap.get(item.id);
      if (existing) {
        _.merge(item, existing);
      } else {
        ITEMS.push(item);
      }

      console.log('Database.upsertItems[' + item.id + '] = ' + JSON.stringify(item));
    });

    return Promise.resolve(items);
  }
}

/**
 * Test NetworkInterface
 */
class TestingNetworkInterface {

  // TODO(burdon): Mocks.
  // import { mockServer } from 'graphql-tools';\

  static NETWORK_DELAY = 2000;

  database = new Database();

  count = 0;

  constructor(stateGetter) {
    this.stateGetter = stateGetter;
  }

  //
  // NetworkInterface
  //

  query({ operationName, query, variables }) {
    let { options } = this.stateGetter();
    let delay = options.networkDelay ? TestingNetworkInterface.NETWORK_DELAY : 0;

    let count = ++this.count;
    console.info(`REQ[${operationName}:${count}]`, TypeUtil.stringify(variables));
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.processQuery(operationName, query, variables)

          .then(response => {
            console.info(`RES[${operationName}:${count}]`, TypeUtil.stringify(response));
            resolve(response);
          })

          .catch(error => {
            reject({
              errors: [{ message: 'TestingNetworkInterface Error: ' + String(error) }],
            });
          });
      }, delay);
    });
  }

  processQuery(operationName, query, variables) {
    switch (operationName) {

      //
      // Query
      //
      case TestQueryName: {
        return this.database.queryItems().then(items => {
          return {
            data: {
              search: {
                __typename: 'SearchResult', // NOTE: Must be present in result.

                items: _.map(items, item => ({
                  __typename: item.type,
                  ...item
                }))
              }
            }
          }
        });
      }

      //
      // Mutation
      //
      case TestMutationName: {
        return this.database.queryItems().then(items => {
          let { mutations } = variables;

          let upsertItems = [];

          let itemMap = ItemUtil.createItemMap(items);
          _.each(mutations, mutation => {
            let { itemId } = mutation;
            let item = itemMap.get(itemId);
            if (!item) {
              item = {
                type: itemId.substring(0, itemId.indexOf('/')),
                id: itemId
              };
            }

            let upsertItem = Transforms.applyObjectMutations(item, mutation.mutations);

            // Important for client-side cache-normalization.
            _.assign(upsertItem, {
              __typename: item.type
            });

            console.log('Upsert Item: ' + JSON.stringify(upsertItem));
            upsertItems.push(upsertItem);
          });

          return this.database.upsertItems(upsertItems).then(items => {
            return {
              data: {
                upsertItems: items
              }
            }
          });
        });
      }

      default: {
        return Promise.reject('Invalid operation: ' + operationName);
      }
    }
  }
}

//-------------------------------------------------------------------------------------------------
// Root Component.
//-------------------------------------------------------------------------------------------------

class RootComponent extends React.Component {

  render() {
    return (
      <div className="test-columns">
        <ListComponentWithApollo/>
        <SimpleListComponentWithApollo/>
        <OptionsComponentWithRedux/>
      </div>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// Redux Reducer.
//-------------------------------------------------------------------------------------------------

const APP_NAMESPACE = 'app';

const APP_UPDATE_OPTIONS = 'APP_UPDATE_OPTIONS';

const AppUpdateOptions = (options) => ({
  type: APP_UPDATE_OPTIONS,
  options
});

// TODO(burdon): Thunk action to insert item (access apollo client directly).
// http://dev.apollodata.com/core/apollo-client-api.html
// https://github.com/gaearon/redux-thunk
export const AppTestAction = (title) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ status: 'OK' });
    })
  }, 100);
};

export const AppState = (state) => state[APP_NAMESPACE];

const AppReducer = (initalState) => (state=initalState, action) => {
  switch (action.type) {
    case APP_UPDATE_OPTIONS: {
      console.log('AppReducer: ' + JSON.stringify(action));
      let { options } = action;
      return _.merge({}, state, { options });
    }
  }

  return state;
};

//-------------------------------------------------------------------------------------------------
// App
// React-Router-Redux => Apollo => Redux => React.
//-------------------------------------------------------------------------------------------------

export class App {

  constructor() {

    //
    // Apollo.
    // https://github.com/apollographql/apollo-client
    //

    // http://dev.apollodata.com/core/apollo-client-api.html#apollo-client
    this._client = new ApolloClient({

      // Cache normalization (allows for automatic updates to all queries following mutations).
      // Requires mutatied items to include __typename attributes.
      // http://dev.apollodata.com/react/cache-updates.html
      addTypename: true,
      dataIdFromObject: (obj) => {
        if (obj.__typename && obj.id) {
          return obj.__typename + '/' + obj.id;
        }
      },

      // http://dev.apollodata.com/core/network.html#NetworkInterface
      // https://github.com/apollographql/apollo-client/blob/master/src/transport/networkInterface.ts
      networkInterface: new TestingNetworkInterface(() => AppState(this._store.getState()))
    });

    //
    // Redux.
    // TODO(burdon): Add Rethunk.
    //

    // Initial options.
    let initialState = {
      options: {
        listReducer: true,
        optimisticResponse: true,
        networkDelay: false
      }
    };

    this._history = createMemoryHistory('/');

    // https://github.com/acdlite/reduce-reducers
    const reducers = combineReducers({
      routing: routerReducer,
      apollo: this._client.reducer(),
      [APP_NAMESPACE]: AppReducer(initialState)
    });

    const enhancers = compose(
      applyMiddleware(thunk),
      applyMiddleware(routerMiddleware(this._history)),
      applyMiddleware(this._client.middleware())
    );

    // http://redux.js.org/docs/api/createStore.html
    this._store = createStore(reducers, enhancers);
  }

  get client() {
    return this._client;
  }

  get store() {
    return this._store;
  }

  get root() {
    return (
      <ApolloProvider client={ this._client } store={ this._store }>
        <Router history={ this._history }>
          <Route path="/" component={ RootComponent }/>
        </Router>
      </ApolloProvider>
    );
  }
}

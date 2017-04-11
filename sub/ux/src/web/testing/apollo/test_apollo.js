//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { createMemoryHistory, Route, Router } from 'react-router';
import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import { routerMiddleware, routerReducer } from 'react-router-redux'
import { graphql, ApolloProvider } from 'react-apollo';
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';

import { ItemUtil, MutationUtil, Transforms } from 'minder-core';

import { ReactUtil } from '../../react';

import './test_apollo.less';

// TODO(burdon): End-to-end unit test.

//-------------------------------------------------------------------------------------------------
// React Component.
//-------------------------------------------------------------------------------------------------

class RootComponent extends React.Component {

  count = 0;

  // TODO(burdon): Dispatch redux action.
  constructor() {
    super(...arguments);

    this.state = {
      text: '',
      items: _.map(this.props.items, item => _.clone(item))
    }
  }

  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps:', JSON.stringify(nextProps));
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

  handleUpdate(event) {
    let { updateItem, insertItem } = this.props;
    let itemId = $(event.target).attr('data');

    if (itemId) {
      let input = this.refs['INPUT/' + itemId];
      let text = $(input).val();
      if (text) {
        updateItem('Task', itemId, [
          MutationUtil.createFieldMutation('title', 'string', text)
        ]);
      }

      input.focus();
    } else {
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
  }

  handleRefetch() {
    this.props.refetch();
  }

  render() {
    return ReactUtil.render(this, (props) => {
      let { items, text } = this.state;

      console.log('RootComponent.render', _.size(items));
      return (
        <div>
          <div>Result[{ ++this.count }]</div>

          <div className="test-list">
            {_.map(items, item => (
              <div key={ item.id }>
                <input ref={ 'INPUT/' + item.id } type="text" value={ item.title } data={ item.id }
                       onChange={ this.handleTextChange.bind(this) }/>

                <button data={ item.id } onClick={ this.handleUpdate.bind(this) }>Update</button>
              </div>
            ))}

            <div>
              <input ref="INPUT_NEW" type="text" value={ text } autoFocus={ true }
                     onChange={ this.handleTextChange.bind(this) }/>

              <button onClick={ this.handleUpdate.bind(this) }>Insert</button>
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

//-------------------------------------------------------------------------------------------------
// Redux Container.
//-------------------------------------------------------------------------------------------------

// TODO(burdon): Read from cache.
// http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.readQuery

const mapStateToProps = (state, ownProps) => {
  return {

  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {

  };
};

const RootComponentWithRedux = connect(mapStateToProps, mapDispatchToProps)(RootComponent);

//-------------------------------------------------------------------------------------------------
// GQL Queries and Mutations.
//-------------------------------------------------------------------------------------------------

const TestQuery = gql`
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

const TestMutation = gql`
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
// Apollo Container.
// http://dev.apollodata.com/react/api-queries.html
//-------------------------------------------------------------------------------------------------

const RootComponentWithReduxAndApollo = compose(

  // http://dev.apollodata.com/react/queries.html
  graphql(TestQuery, {

    // http://dev.apollodata.com/react/queries.html#graphql-options
    options: (props) => {
      console.log('graphql.options:', TestQueryName);

      return {
        // http://dev.apollodata.com/react/api-queries.html#graphql-config-options-fetchPolicy
        fetchPolicy: 'network-only',

        variables: {
          filter: { Type: 'Task' }
        }
      };
    },

    // http://dev.apollodata.com/react/api-queries.html#graphql-query-options
    // http://dev.apollodata.com/react/queries.html#graphql-skip

    // http://dev.apollodata.com/react/queries.html#graphql-props-option
    props: ({ ownProps, data }) => {
      let { errors, loading, search } = data;
      console.log('graphql.props:  ', TestQueryName, loading ? 'loading...' : JSON.stringify(search));

      // TODO(burdon): updateQuery.

      let items = _.get(search, 'items');

      // Decouple Apollo query/result from component.
      return {
        errors,
        loading,

        items,

        refetch: () => {
          // NOTE: Doesn't trigger re-render unless results change.
          data.refetch();
        }
      };
    }
  }),

  // http://dev.apollodata.com/react/mutations.html
  graphql(TestMutation, {

    // TODO(burdon): Secondary read-only list with same query (see if it updates).
    // TODO(burdon): Process mutation result (to update cache).
    // TODO(burdon): Optimistic results.
    // TODO(burdon): Reducer (add to list).

    // http://dev.apollodata.com/react/mutations.html#custom-arguments
    props: ({ ownProps, mutate }) => ({

      //
      // Insert item.
      //
      insertItem: (type, mutations) => {
        mutate({
          variables: {
            mutations: [
              {
                itemId: type + '/' + Date.now(),
                mutations
              }
            ]
          }
        })
      },

      //
      // Insert item.
      //
      updateItem: (type, itemId, mutations) => {
        mutate({
          variables: {
            mutations: [
              {
                itemId,
                mutations
              }
            ]
          }
        })
      }
    })
  })

)(RootComponentWithRedux);

//-------------------------------------------------------------------------------------------------
// Redux Reducer.
//-------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------
// Test Server.
//-------------------------------------------------------------------------------------------------

const ITEMS = [
  {
    type: 'Task',
    id: 'Task/1',
    title: 'Task 1'
  },
  {
    type: 'Task',
    id: 'Task/2',
    title: 'Task 2'
  },
  {
    type: 'Task',
    id: 'Task/3',
    title: 'Task 3'
  }
];

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

class TestingNetworkInterface {

  database = new Database();

  count = 0;

  //
  // NetworkInterface
  //

  query({ operationName, query, variables }) {
    let count = ++this.count;
    console.info(`REQ[${operationName}:${count}]`, JSON.stringify(variables));

    return this.processQuery(operationName, query, variables)
      .then(response => {
        console.info(`RES[${operationName}:${count}]`, JSON.stringify(response));
        return response;
      })
      .catch(error => {
        return {
          errors: [{ message: 'TestingNetworkInterface Error: ' + String(error) }],
        }
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
// App
// React-Router-Redux => Apollo => Redux => React.
//-------------------------------------------------------------------------------------------------

class App {

  constructor() {

    //
    // Apollo.
    // https://github.com/apollographql/apollo-client
    //

    // http://dev.apollodata.com/core/apollo-client-api.html#apollo-client
    this._client = new ApolloClient({

      // TODO(burdon): Cache normalization.
      // http://dev.apollodata.com/react/cache-updates.html
      // addTypename: true,
      // dataIdFromObject: (obj) => {
      //   if (obj.__typename && obj.id) {
      //     return obj.__typename + '/' + obj.id;
      //   }
      // },

      // http://dev.apollodata.com/core/network.html#NetworkInterface
      // https://github.com/apollographql/apollo-client/blob/master/src/transport/networkInterface.ts
      networkInterface: new TestingNetworkInterface()
    });

    //
    // Redux.
    // TODO(burdon): Add Rethunk.
    //

    this._history = createMemoryHistory('/');

    // TODO(burdon): AppReducer.

    // https://github.com/acdlite/reduce-reducers
    const reducers = combineReducers({
      routing: routerReducer,
      apollo: this._client.reducer()
    });

    const enhancers = compose(
      applyMiddleware(routerMiddleware(this._history)),
      applyMiddleware(this._client.middleware())
    );

    // http://redux.js.org/docs/api/createStore.html
    this._store = createStore(reducers, enhancers);
  }

  get router() {
    return (
      <ApolloProvider client={ this._client } store={ this._store }>
        <Router history={ this._history }>
          <Route path="/" component={ RootComponentWithReduxAndApollo }/>
        </Router>
      </ApolloProvider>
    );
  }
}

ReactDOM.render(new App().router, document.getElementById('test-container'));

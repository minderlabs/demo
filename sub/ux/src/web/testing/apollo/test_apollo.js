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

import { ReactUtil } from '../../react';

import './test_apollo.less';

//-------------------------------------------------------------------------------------------------
// React Component.
//-------------------------------------------------------------------------------------------------

class RootComponent extends React.Component {

  count = 0;


  // TODO(burdon): Dispatch redux action.

  handleRefetch() {
    this.props.refetch();
  }

  render() {
    return ReactUtil.render(this, (props) => {
      let { search } = this.props;

      console.log('RootComponent.render:', JSON.stringify(search));
      return (
        <div>
          <div>Result[{ ++this.count }]</div>

          {_.map(search.items, item => (
            <div key={ item.id } title={ item.id }>{ item.title }</div>
          ))}

          <button onClick={ this.handleRefetch.bind(this) }>Refetch</button>
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
// Apollo Container.
// http://dev.apollodata.com/react/api-queries.html
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

// TODO(burdon): Mutation and optimistic response.
//const TestMutation = gql``;

const RootComponentWithReduxAndApollo = compose(

  // http://dev.apollodata.com/react/queries.html
  graphql(TestQuery, {

    // http://dev.apollodata.com/react/queries.html#graphql-options
    options: (props) => {
      console.log('graphql.options:', _.get(TestQuery, 'definitions[0].name.value'));

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
      console.log('graphql.props:  ', _.get(TestQuery, 'definitions[0].name.value'),
        loading ? 'loading...' : JSON.stringify(search));

      // TODO(burdon): updateQuery.

      // Decouple Apollo query/result from component.
      return {
        errors,
        loading,

        search,

        refetch: () => {
          // NOTE: Doesn't trigger re-render unless results change.
          data.refetch();
        }
      };
    }
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
    __typename: 'Task',
    type: 'Task',
    id: 'T-1',
    title: 'Task 1'
  },
  {
    __typename: 'Task',
    type: 'Task',
    id: 'T-2',
    title: 'Task 2'
  },
  {
    __typename: 'Task',
    type: 'Task',
    id: 'T-3',
    title: 'Task 3'
  }
];

class TestingNetworkInterface {

  count = 0;

  query({ operationName, query, variables }) {
    let count = ++this.count;
    console.info(`REQ[${operationName}:${count}]`, JSON.stringify(variables));
    return Promise.resolve({
//    errors: [{ message: 'TestingNetworkInterface Error' }],
      data: {
        search: {
          __typename: 'SearchResult', // NOTE: Must be present in result.
          items: ITEMS
        }
      }
    }).then(response => {
      console.info(`RES[${operationName}:${count}]`, JSON.stringify(response));
      return response;
    });
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

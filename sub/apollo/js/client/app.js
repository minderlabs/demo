//
// Copyright 2016 Alien Laboratories, Inc.
//
// Apollo Evaluation:
// https://dev-blog.apollodata.com/apollo-client-graphql-with-react-and-redux-49b35d0f2641#.ovjpku8rm
// https://medium.com/@codazeninc/choosing-a-graphql-client-apollo-vs-relay-9398dde5363a#.cf5fsaska
//

'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Match } from 'react-router';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { ApolloProvider } from 'react-apollo';
import ApolloClient, { createNetworkInterface } from 'apollo-client';

import DevTools from './container/devtools';
import Layout from './container/layout';

//
// Server provided config.
//

const config = window.config;


//
// Apollo
// http://dev.apollodata.com/react
// https://github.com/reactjs/redux/blob/master/docs/api/createStore.md
// https://github.com/apollostack/GitHunt-React
//

// http://dev.apollodata.com/core/network.html#networkInterfaceAfterware
const networkInterface = createNetworkInterface({ uri: config.graphql });

const client = new ApolloClient({
  networkInterface
});

networkInterface.useAfter([{
  applyAfterware({ response }, next) {
    switch (response.status) {
      case 200: {
        console.log('OK');
        break;
      }

      default: {
        // TODO(burdon): How to propagate to components?
        console.error(response.statusText);
      }
    }
    next();
  }
}]);


//
// Redux
// http://dev.apollodata.com/react/redux.html
// https://github.com/reactjs/react-redux
//

const reducers = combineReducers({

  // Apollo framework reducer.
  apollo: client.reducer(),

  // App reducers.
  // http://redux.js.org/docs/api/Store.html
  minder: (state={ userId: config.userId }, action) => {
    return state
  }
});

const enhancer = compose(
  applyMiddleware(client.middleware()),

  // https://github.com/gaearon/redux-devtools
  // https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
  DevTools.instrument()
);

const store = createStore(reducers, {}, enhancer);


//
// Router (v4)
// https://github.com/ReactTraining/react-router/tree/v4
// https://react-router.now.sh/quick-start
// NOTE: Must use declarative component (not render) otherwise squashes router properties.
//

// TODO(burdon): Configure hot loading (with Redux DevTools).
// https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md

ReactDOM.render(
  <ApolloProvider store={ store } client={ client }>
    <BrowserRouter>
      <Match pattern="/" component={ Layout }/>
    </BrowserRouter>
  </ApolloProvider>,

  document.getElementById(config.root)
);


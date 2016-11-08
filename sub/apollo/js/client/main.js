//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';

import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from 'react-apollo';

import DevTools from './container/devtools';
import Layout from './container/layout';
import Home from './container/home';

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
networkInterface.useAfter([{
  applyAfterware({ response }, next) {
    switch (response.status) {
      case 200:
        break;

      default:
        console.error(response.statusText);
    }
    next();
  }
}]);

const client = new ApolloClient({
  networkInterface
});


//
// Redux
//

const reducers = combineReducers({
  apollo: client.reducer()
});

const initialState = {};

const enhancer = compose(
  applyMiddleware(client.middleware()),

  // https://github.com/gaearon/redux-devtools
  // https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
  DevTools.instrument()
);

const store = createStore(reducers, initialState, enhancer);

//
// Router
//

const routes = (
  <Route path="/" component={ Layout }>
    <IndexRoute component={ Home }/>
  </Route>
);

//
// Start
//

// TODO(burdon): Configure hot loading (with Redux DevTools).
// https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md

ReactDOM.render(
  <ApolloProvider store={ store } client={ client }>
    <Router history={browserHistory}>
      { routes }
    </Router>
  </ApolloProvider>,

  document.getElementById(config.root)
);

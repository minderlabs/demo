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

import moment from 'moment';

import DevTools from './component/devtools';
import Application from './app';

//
// Server provided config.
//

const config = window.config;
console.log('Config = %s', JSON.stringify(config));


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
        console.log('Net: %s', moment().format('hh:mm:ss'));
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


/**
 * Renders the application.
 * @param App Root component.
 */
function renderApp(App) {
  console.log('### [%s] ###', moment().format('hh:mm:ss'));

  ReactDOM.render(
    <App config={ config } client={ client } store={ store }/>,

    document.getElementById(config.root)
  );
}


//
// React Hot Loader (3)
// https://github.com/gaearon/react-hot-boilerplate/pull/61
// https://webpack.github.io/docs/hot-module-replacement.html
//

console.log(module.hot, config.debug.env);

if (module.hot && _.get(config, 'debug.env') === 'hot') {

  // List modules that can be dynamically reloaded.
  module.hot.accept('./app', () => {
    renderApp(require('./app').default);
  });
}


//
// Start app.
//

renderApp(Application);
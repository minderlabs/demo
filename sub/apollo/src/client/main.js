//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory } from 'react-router'
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { syncHistoryWithStore, routerMiddleware, routerReducer } from 'react-router-redux'
import ApolloClient from 'apollo-client';

import moment from 'moment';

import { IdGenerator, Injector, Matcher } from 'minder-core';

import { AppReducer } from './reducers';
import { QueryRegistry } from './data/subscriptions';

import Application from './app';
import networkInterface from './network';
import Monitor from './view/component/devtools';


//
// Server provided config.
//

// TODO(burdon): Wrap.
const config = window.config;


//
// Dependency injection (accessible to component props via Redux store).
//

const injector = new Injector([
  Injector.provider(new Matcher()),
  Injector.provider(new IdGenerator()),
  Injector.provider(new QueryRegistry())
]);


//
// Error handling.
//

window.addEventListener('error', (error) => {
  console.log('ERROR', error);
});


//
// Apollo
// http://dev.apollodata.com/react
// https://github.com/reactjs/redux/blob/master/docs/api/createStore.md
// https://github.com/apollostack/GitHunt-React
//

const apolloClient = new ApolloClient({

  // Normalization (for client caching).
  // http://dev.apollodata.com/react/cache-updates.html#dataIdFromObject
  dataIdFromObject: (result) => {

    // Extract the ID for types.
    if (result.__typename && result.id) {
      return result.__typename + '/' + result.id;
    }

    return null;
  },

  networkInterface
});


//
// Redux
// http://dev.apollodata.com/react/redux.html
// https://github.com/reactjs/react-redux
//


const reducers = combineReducers({

  // React Redux Router.
  routing: routerReducer,

  // Apollo framework reducer.
  apollo: apolloClient.reducer(),

  // App reducers.
  ...AppReducer(config, injector),
});

const enhancer = compose(

  // Apollo-Redux bindings.
  applyMiddleware(apolloClient.middleware()),

  // Enable navigation via redux dispatch.
  // https://github.com/reactjs/react-router-redux#what-if-i-want-to-issue-navigation-events-via-redux-actions
  // https://github.com/reactjs/react-router-redux#pushlocation-replacelocation-gonumber-goback-goforward
  applyMiddleware(routerMiddleware(browserHistory)),

  // NOTE: Must go last.
  // https://github.com/gaearon/redux-devtools
  // https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
  Monitor.instrument()
);

// https://github.com/reactjs/redux/blob/master/docs/api/createStore.md
const store = createStore(reducers, {}, enhancer);

// Enhanced history that syncs navigation events with the store.
const history = syncHistoryWithStore(browserHistory, store);

// TODO(burdon): Factor out logging.
history.listen(location => { console.log('Router: %s', location.pathname); });


/**
 * Renders the application (used by hot loader).
 * @param App Root component.
 */
const renderApp = (App) => {
  console.log('### [%s %s] ###', moment().format('hh:mm:ss'), _.get(config, 'debug.env'));

  ReactDOM.render(
    <App
      client={ apolloClient }
      history={ history }
      store={ store }
    />,

    document.getElementById(config.root)
  );
};


//
// React Hot Loader (3)
// https://github.com/gaearon/react-hot-boilerplate/pull/61
// https://webpack.github.io/docs/hot-module-replacement.html
//

if (module.hot && _.get(config, 'debug.env') === 'hot') {

  // List modules that can be dynamically reloaded.
  module.hot.accept('./app', () => {
    renderApp(require('./app').default);
  });
}


//
// Start app.
//

console.log('Config = %s', JSON.stringify(config));

renderApp(Application);
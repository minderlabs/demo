//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';


// TODO(burdon): Apollo Evaluation:
// https://www.reindex.io/blog/redux-and-relay
// https://dev-blog.apollodata.com/apollo-client-graphql-with-react-and-redux-49b35d0f2641#.ovjpku8rm
// https://medium.com/@codazeninc/choosing-a-graphql-client-apollo-vs-relay-9398dde5363a#.cf5fsaska
// https://medium.freecodecamp.com/tutorial-how-to-use-graphql-in-your-redux-app-9bf8ebbeb362#.m5mpkzy7k

// TODO(burdon): Subscriptions.
// https://github.com/apollostack/graphql-subscriptions (Redis/Rethink)
// http://dev.apollodata.com/react/receiving-updates.html#Subscriptions
// TODO(burdon): Caching (mobile/offline roadmap)?
// http://dev.apollodata.com/react/receiving-updates.html
// TODO(burdon): Native?
// TODO(burdon): Optimistic UI.
// TODO(burdon): Update cache with updateQueries.

// Benefits over Relay:
//  - simplicity
//    - micro-frameworks
//    - native schema with separate resolvers
//    - client syntax
//    - no magic
//    - tools
//  - redux
//    - state machine (HUGE benefit for complex apps)
//    - tools
//  - Relay 2.0 looks sketchy (and moving towards Apollo)

// NEXT
// TODO(burdon): Edit title in detail.
// TODO(burdon): Favorites/folders (how to invalidate cache)?
// TODO(burdon): Factor out GraphQL and tests to ../graphql
// TODO(burdon): Subscriptions.



import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Match } from 'react-router';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { ApolloProvider } from 'react-apollo';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import createBrowserHistory from 'history/createBrowserHistory'

import moment from 'moment';

import { ACTION, AppReducer } from './reducers';

import Application from './app';
import Monitor from './component/devtools';


//
// Server provided config.
//

const config = window.config;
console.log('Config = %s', JSON.stringify(config));


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

// TODO(burdon): Batching.
// https://github.com/apollostack/core-docs/blob/master/source/network.md#query-batching
const networkInterface = createNetworkInterface({
  uri: config.graphql
});

const TIMESTAMP = 'hh:mm:ss.SSS';

//
// http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
//

networkInterface.use([{
  applyMiddleware({ request }, next) {
    console.log('[%s] >>> [%s]: %s', moment().format(TIMESTAMP),
      request.operationName, JSON.stringify(request.variables));

    // TODO(burdon): Paging bug when non-null text filter.
    // https://github.com/apollostack/apollo-client/issues/897
    // "There can only be one fragment named ItemFragment" (from server).
    let definitions = {};
    request.query.definitions = _.filter(request.query.definitions, (definition) => {
      let name = definition.name.value;
      if (definitions[name]) {
        console.warn('SKIPPING: %s', name);
        return false;
      } else {
        definitions[name] = true;
        return true;
      }
    });

    next();
  }
}]);

//
// http://dev.apollodata.com/core/network.html#networkInterfaceAfterware
// https://github.com/apollostack/apollo-client/issues/657
//

networkInterface.useAfter([{
  applyAfterware({ response }, next) {
    // https://github.com/apollostack/core-docs/issues/224
    // https://developer.mozilla.org/en-US/docs/Web/API/Response/clone
    if (!response.ok) {
      response.clone().text().then(bodyText => {
        console.error(`Network Error [ ${response.status}]: (${response.statusText}) (${bodyText})`);
        next();
      });
    } else {
      response.clone().json().then((result) => {
        let { data, errors } = result;

        if (errors) {
          console.error('GraphQL Error:', errors.map(error => error.message));
        } else {
          console.log('[%s] <<<', moment().format(TIMESTAMP),
            JSON.stringify(data, (key, value) => { return _.isArray(value) ? value.length : value }));
        }

        next();
      });
    }
  }
}]);

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

const history = createBrowserHistory();

const initialRouterState = {
  location: history.location,
  action: history.action
};

const reducers = combineReducers({

  // Apollo framework reducer.
  apollo: apolloClient.reducer(),

  // History router.
  router: (state=initialRouterState, action) => {
    if (action.type === ACTION.NAVIGATE) {
      return {
        location: action.location,
        action: action.action
      }
    }

    return state;
  },

  // App reducers.
  ...AppReducer(config),
});

const enhancer = compose(

  // Apollo-Redux bindings.
  applyMiddleware(apolloClient.middleware()),

  // NOTE: Must go last.
  // https://github.com/gaearon/redux-devtools
  // https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
  Monitor.instrument()
);

// https://github.com/reactjs/redux/blob/master/docs/api/createStore.md
const reduxStore = createStore(reducers, {}, enhancer);


/**
 * Renders the application.
 * @param App Root component.
 */
function renderApp(App) {
  console.log('### [%s] ###', moment().format('hh:mm:ss'));

  ReactDOM.render(
    <App config={ config } history={ history } client={ apolloClient } store={ reduxStore }/>,

    document.getElementById(config.root)
  );
}


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

renderApp(Application);

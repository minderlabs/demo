//
// Copyright 2017 Minder Labs.
//

// NOTE: Must come first.
import './config';

import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory } from 'react-router'
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { syncHistoryWithStore, routerMiddleware, routerReducer } from 'react-router-redux'
import ApolloClient from 'apollo-client';

import moment from 'moment';

import { EventHandler, IdGenerator, Injector, Matcher, QueryParser } from 'minder-core';

import { QueryRegistry } from './data/subscriptions';
import { TypeRegistryDefs } from './component/type/registry';

import { AuthManager, ConnectionManager, NetworkManager } from './network';
import { Monitor } from './component/devtools';

const logger = Logger.get('main');

/**
 * Base class for all Minder (Apollo) apps.
 */
export class Base {

  constructor(config) {
    console.assert(config);
    this.config = config;

    // Event bus propagates events (e.g., error messages) to components.
    this.eventHandler = new EventHandler();

    // TODO(burdon): Experimental (replace with Apollo directives).
    // Manages Apollo query subscriptions.
    this.queryRegistry = new QueryRegistry();
  }

  /**
   * Initialize everything.
   *
   * @return {Promise}
   */
  init() {
    this.initErrorHandling();
    this.initInjector();
    this.initNetwork();
    this.initApollo();
    this.initReduxStore();
    this.initRouter();

    logger.log($$('Config = %o', this.config));

    return Promise.resolve();
  }

  /**
   * Global error handling.
   */
  initErrorHandling() {

    // TODO(burdon): Configure webpack so this isn't needed.
    console.assert = (value) => {
      if (!value) {
        console.error(new Error().stack);
        throw 'Invalid arg.';
      }
    };

    window.addEventListener('error', (error) => {
      this.eventHandler.emit({
        type: 'error',
        message: error.message
      });
    });

    // https://developer.mozilla.org/en-US/docs/Web/Events/unhandledrejection
    window.addEventListener('unhandledrejection', (event) => {
      let message = event.reason ? String(event.reason) : 'Uncaught promise';
      logger.error(message);
      this.eventHandler.emit({
        type: 'error',
        message
      });
    });
  }

  /**
   * Injectors.
   */
  initInjector() {
    let providers = _.concat([
      Injector.provider(this.eventHandler),
      Injector.provider(this.queryRegistry),
      Injector.provider(new IdGenerator()),
      Injector.provider(new Matcher()),
      Injector.provider(new QueryParser()),
      Injector.provider(TypeRegistryDefs)
    ], this.providers);

    // TODO(burdon): Move to Redux.
    this.injector = new Injector(providers);
  }

  /**
   * Initialize the Apollo network interface.
   */
  initNetwork() {}

  /**
   * Acpollo client.
   */
  initApollo() {
    console.assert(this.networkInterface);

    this.apolloClient = new ApolloClient({

      // TODO(burdon): Move to minder-core.
      // Normalization (for client caching).
      // http://dev.apollodata.com/react/cache-updates.html#dataIdFromObject
      dataIdFromObject: (result) => {

        // Extract the ID for types.
        if (result.__typename && result.id) {
          return result.__typename + '/' + result.id;
        }

        return null;
      },

      networkInterface: this.networkInterface
    });
  }

  /**
   * Redux store.
   *
   * http://dev.apollodata.com/react/redux.html
   * https://github.com/reactjs/react-redux
   * https://github.com/reactjs/redux/blob/master/docs/api/createStore.md
   */
  initReduxStore() {

    // http://redux.js.org/docs/api/combineReducers.html
    const reducers = combineReducers(_.merge({

      // React Redux Router.
      routing: routerReducer,

      // Apollo framework reducer.
      apollo: this.apolloClient.reducer(),

    }, this.reducers));

    // https://github.com/reactjs/redux/blob/master/docs/api/compose.md
    const enhancer = compose(

      // Apollo-Redux bindings.
      applyMiddleware(this.apolloClient.middleware()),

      // Enable navigation via redux dispatch.
      // https://github.com/reactjs/react-router-redux#what-if-i-want-to-issue-navigation-events-via-redux-actions
      // https://github.com/reactjs/react-router-redux#pushlocation-replacelocation-gonumber-goback-goforward
      applyMiddleware(routerMiddleware(browserHistory)),

      // NOTE: Must go last.
      // https://github.com/gaearon/redux-devtools
      // https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
      Monitor.instrument()
    );

    // http://redux.js.org/docs/api/createStore.html
    this.store = createStore(reducers, {}, enhancer);
  }

  /**
   * React router.
   */
  initRouter() {

    // Enhanced history that syncs navigation events with the store.
    this.history = syncHistoryWithStore(browserHistory, this.store);

    // TODO(burdon): Factor out logging.
    this.history.listen(location => {
      logger.log($$('Router: %s', location.pathname));
    });
  }

  /**
   * App-specific Redux reducers.
   */
  get reducers() {
    return {};
  }

  /**
   * App-specific injector proviers.
   */
  get providers() {
    return [];
  }

  render(App) {
    logger.log($$('### [%s %s] ###', moment().format('hh:mm:ss'), _.get(this.config, 'debug.env')));

    // Construct app.
    const app = (
      <App
        injector={ this.injector }
        client={ this.apolloClient }
        history={ this.history }
        store={ this.store }/>
    );

    // Render app.
    ReactDOM.render(app, document.getElementById(this.config.root));  // TODO(burdon): Rename appRoot.
  }
}

/**
 * Base class for Web apps.
 */
export class WebBase extends Base {

  /**
   * Apollo network.
   */
  initNetwork() {
    // Wraps Apollo network requests.
    let networkManager = new NetworkManager(this.config, this.eventHandler);

    // Manages the client connection and registration.
    let connectionManager =
      new ConnectionManager(this.config, networkManager, this.queryRegistry, this.eventHandler);

    // Manages OAuth.
    this.authManager = new AuthManager(this.config, networkManager, connectionManager).init();

    // Apollo network interface.
    this.networkInterface = networkManager.networkInterface;
  }
}

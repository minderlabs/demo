//
// Copyright 2017 Minder Labs.
//

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
    this._config = config;

    // Event bus propagates events (e.g., error messages) to components.
    this._eventHandler = new EventHandler();

    // TODO(burdon): Experimental (replace with Apollo directives).
    // Manages Apollo query subscriptions.
    this._queryRegistry = new QueryRegistry();
  }

  /**
   * Initialize everything.
   *
   * @return {Promise}
   */
  init() {
    return this.initErrorHandling()
      .then(() => this.initInjector())
      .then(() => this.initNetwork())
      .then(() => this.initApollo())
      .then(() => this.initReduxStore())
      .then(() => this.initRouter())
      .then(() => this.postInit())
      .then(() => {
        logger.log($$('Config = %o', this._config));
      });
  }

  /**
   *
   * @return {Promise.<T>}
   */
  postInit() {
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
      this._eventHandler.emit({
        type: 'error',
        message: error.message
      });
    });

    // https://developer.mozilla.org/en-US/docs/Web/Events/unhandledrejection
    window.addEventListener('unhandledrejection', (event) => {
      let message = event.reason ? String(event.reason) : 'Uncaught promise';
      logger.error(message);
      this._eventHandler.emit({
        type: 'error',
        message
      });
    });

    return Promise.resolve();
  }

  /**
   * Injectors.
   */
  initInjector() {
    let providers = _.concat([
      Injector.provider(this._eventHandler),
      Injector.provider(this._queryRegistry),
      Injector.provider(new IdGenerator()),
      Injector.provider(new Matcher()),
      Injector.provider(new QueryParser()),
      Injector.provider(TypeRegistryDefs)
    ], this.providers);

    // TODO(burdon): Move to Redux.
    this._injector = new Injector(providers);

    return Promise.resolve();
  }

  /**
   * Initialize the Apollo network interface.
   * @return {Promise}
   */
  initNetwork() {
    return Promise.resolve();
  }

  /**
   * Acpollo client.
   */
  initApollo() {
    console.assert(this._networkInterface);

    this._apolloClient = new ApolloClient({

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

      networkInterface: this._networkInterface
    });

    return Promise.resolve();
  }

  /**
   * Redux store.
   *
   * http://dev.apollodata.com/react/redux.html
   * https://github.com/reactjs/react-redux
   * https://github.com/reactjs/redux/blob/master/docs/api/createStore.md
   */
  initReduxStore() {

    // State handlers.
    // http://redux.js.org/docs/api/combineReducers.html
    const reducers = combineReducers(_.merge({

      // React Redux Router.
      routing: routerReducer,

      // Apollo framework reducer.
      apollo: this._apolloClient.reducer(),

    }, this.reducers));

    // Enhance the store.
    // https://github.com/reactjs/redux/blob/master/docs/Glossary.md#store-enhancer
    const enhancer = compose(

      // Apollo-Redux bindings.
      applyMiddleware(this._apolloClient.middleware()),

      // Enable navigation via redux dispatch.
      // https://github.com/reactjs/react-router-redux#what-if-i-want-to-issue-navigation-events-via-redux-actions
      // https://github.com/reactjs/react-router-redux#pushlocation-replacelocation-gonumber-goback-goforward
      applyMiddleware(routerMiddleware(this.history)),

      // NOTE: Must go last.
      // https://github.com/gaearon/redux-devtools
      // https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
      Monitor.instrument()
    );

    // http://redux.js.org/docs/api/createStore.html
    this._store = createStore(reducers, {}, enhancer);

    return Promise.resolve();
  }

  /**
   * React router.
   */
  initRouter() {

    // Enhanced history that syncs navigation events with the store.
    this._reduxHistory = syncHistoryWithStore(this.history, this._store);

    // TODO(burdon): Factor out logging.
    this.history.listen(location => {
      logger.log($$('Router: %s', location.pathname));
    });

    return Promise.resolve();
  }

  /**
   * Access the store (for dispatching actions).
   */
  get store() {
    return this._store;
  }

  /**
   * React router history.
   */
  get history() {
    return null;
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

  /**
   * Renders the root application.
   *
   * <Application injector={} client={} state={} history={}>
   *   <ApolloProvider client={} store={}>
   *     <Router history={}>
   *       <Route path="/activity" component={ Activity }/>
   *     </Router>
   *   </ApolloProvider
   * </Application>
   *
   * Routes instantiate activity components, which receive params from the path.
   *
   * <Activity>
   *   <Layout>
   *     <Canvas/>
   *   </Layout>
   * </Activity>
   */
  render(App) {
    logger.log($$('### [%s %s] ###', moment().format('hh:mm:ss'), _.get(this._config, 'debug.env')));

    // Construct app.
    const app = (
      // TODO(burdon): Get injector from store?
      <App
        injector={ this._injector }
        client={ this._apolloClient }
        history={ this._reduxHistory }
        store={ this._store }/>
    );

    // Render app.
    ReactDOM.render(app, document.getElementById(this._config.root));  // TODO(burdon): Rename appRoot.
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
    let networkManager = new NetworkManager(this._config, this._eventHandler);
    this._networkInterface = networkManager.networkInterface;

    // Manages the client connection and registration.
    let connectionManager =
      new ConnectionManager(this._config, networkManager, this._queryRegistry, this._eventHandler);

    // Manages OAuth.
    let authManager = new AuthManager(this._config, networkManager, connectionManager);
    return authManager.authenticate();
  }

  // https://github.com/ReactTraining/react-router/blob/master/docs/guides/Histories.md#browserhistory
  get history() {
    return browserHistory;
  }
}

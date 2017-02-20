//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { syncHistoryWithStore, routerMiddleware, routerReducer } from 'react-router-redux'
import ReduxThunk from 'redux-thunk'
import ApolloClient from 'apollo-client';

import moment from 'moment';

import { EventHandler, ID, IdGenerator, Injector, Matcher, QueryParser, QueryRegistry } from 'minder-core';

import { ErrorHandler } from './errors';

//import { Monitor } from './component/devtools';

const logger = Logger.get('main');

/**
 * Base class for all Minder (Apollo) apps.
 */
export class BaseApp {

  constructor(config) {
    console.assert(config);
    this._config = config;

    // Event bus propagates events (e.g., error messages) to components.
    this._eventHandler = new EventHandler();

    // TODO(burdon): Experimental (replace with Apollo directives).
    // Manages Apollo query subscriptions.
    this._queryRegistry = new QueryRegistry();

    // Errors.
    ErrorHandler.handleErrors(this._eventHandler);
  }

  /**
   * Initialize everything.
   *
   * @return {Promise}
   */
  init() {
    return this.initInjector()
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

    // TODO(burdon): Define in webpack?
    console.assert = (cond, message) => {
      if (!cond) {
        // NOTE: This is either caught by onerror or unhandledrejection below.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
        throw new Error(message ? 'Assert: ' + message : 'Assert failed.');
      }
    };

    // https://developer.mozilla.org/en-US/docs/Web/Events/error
    window.onerror = (error) => {
      logger.error(error);
      this._eventHandler.emit({
        type: 'error',
        message: error.message
      });
    };

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
    ], this.providers);

    // TODO(burdon): Move to Redux?
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
    let networkInterface = this.networkInterface;
    console.assert(networkInterface);

    // TODO(burdon): Custom resolvers.
    // http://dev.apollodata.com/react/cache-updates.html#cacheRedirect

    // http://dev.apollodata.com/react/initialization.html
    // https://github.com/apollostack/apollo-client/blob/6b6e8ded1e0f83cb134d2261a3cf7d2d9416400f/src/ApolloClient.ts
    this._apolloClient = new ApolloClient({
      dataIdFromObject: ID.dataIdFromObject,
      queryDeduplication: true,
      addTypename: true,
      networkInterface
    });

    // TODO(burdon): subscribe().

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

      // Redux-thunk (for asynchronous actions).
      // NOTE: The arg is passed as the third arg to the handler:
      // () => (dispatch, getState, injector) => { ... }
      applyMiddleware(ReduxThunk.withExtraArgument(this._injector)),

      // Apollo-Redux bindings.
      applyMiddleware(this._apolloClient.middleware()),

      // Enable navigation via redux dispatch.
      // https://github.com/reactjs/react-router-redux#what-if-i-want-to-issue-navigation-events-via-redux-actions
      // https://github.com/reactjs/react-router-redux#pushlocation-replacelocation-gonumber-goback-goforward
      applyMiddleware(routerMiddleware(this.history)),

      // NOTE: Must go last.
      // https://github.com/gaearon/redux-devtools
      // https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
      // TODO(burdon): Factor out.
//    Monitor.instrument()
    );

    // http://redux.js.org/docs/api/createStore.html
    this._store = createStore(reducers, enhancer);

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
   * Flush the cache and reset the Apollo store.
   */
  resetStore() {
    logger.warn('Resetting store...');

    // Reset store (causes queries to update).
    // https://github.com/apollostack/apollo-client/blob/6b6e8ded1e0f83cb134d2261a3cf7d2d9416400f/src/ApolloClient.ts
    this._apolloClient.resetStore();
  }

  /**
   * Access config
   */
  get config() {
    return this._config;
  }

  /**
   * Access the store (for dispatching actions).
   */
  get store() {
    return this._store;
  }

  //
  // Virtual methods.
  //

  /**
   * Returns the Apollo network interface.
   */
  get networkInterface() {
    return null;
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
    logger.log($$('### [%s %s] ###', moment().format('hh:mm:ss'), _.get(this._config, 'env')));

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
    let root = document.getElementById(this._config.root);
    ReactDOM.render(app, root);
    return root;
  }
}

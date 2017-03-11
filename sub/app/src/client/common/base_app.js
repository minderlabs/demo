//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { syncHistoryWithStore, routerMiddleware, routerReducer } from 'react-router-redux'
import ReduxThunk from 'redux-thunk'
import reduceReducers from 'reduce-reducers';
import ApolloClient from 'apollo-client';

import moment from 'moment';

import { ErrorUtil, EventHandler, ID, IdGenerator, Injector, Matcher, QueryParser, QueryRegistry } from 'minder-core';

const logger = Logger.get('main');

/**
 * Base class for all Minder (Apollo) apps.
 *
 * This is the App's top-level class hat configures the Injector, Apollo, Redux reducers, Router, etc.
 * It also renders the App's top-level React component, which defines the react-router Routes.
 *
 */
export class BaseApp {

  constructor(config) {
    console.assert(config);
    this._config = config;

    // TODO(burdon): Rename EventListener.
    // Event bus propagates events (e.g., error messages) to components.
    this._eventHandler = new EventHandler();

    // TODO(burdon): Experimental (replace with Apollo directives).
    // Manages Apollo query subscriptions.
    this._queryRegistry = new QueryRegistry();

    ErrorUtil.handleErrors(window, error => {
      logger.error(error);
      this._eventHandler.emit({
        type: 'error',
        message: ErrorUtil.message(error)
      });
    });
  }

  /**
   * Initialize everything.
   *
   * @return {Promise}
   */
  init() {

    // Invoke sequentially.
    return Promise.resolve()
      .then(() => this.initInjector())
      .then(() => this.initNetwork())
      .then(() => this.initApollo())
      .then(() => this.initReduxStore())
      .then(() => this.initRouter())
      .then(() => this.postInit())
      .then(() => {
        logger.info($$('Config = %o', this._config));
        return this;
      });
  }

  /**
   *
   * @return {Promise.<T>}
   */
  postInit() {}

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
  }

  /**
   * Initialize the Apollo network interface.
   * @return {Promise}
   */
  initNetwork() {}

  /**
   * Acpollo client.
   */
  initApollo() {
    console.assert(this.networkInterface);

    //
    // http://dev.apollodata.com/react/initialization.html
    // http://dev.apollodata.com/core/apollo-client-api.html#apollo-client
    // https://github.com/apollostack/apollo-client/blob/6b6e8ded1e0f83cb134d2261a3cf7d2d9416400f/src/ApolloClient.ts
    //

    this._apolloClient = new ApolloClient({

      // http://dev.apollodata.com/react/cache-updates.html
      dataIdFromObject: ID.dataIdFromObject,
      addTypename: true,

      // http://dev.apollodata.com/core/network.html#query-deduplication
      queryDeduplication: true,

      // http://dev.apollodata.com/core/network.html
      networkInterface: this.networkInterface,

      // https://github.com/apollographql/apollo-client-devtools
      // https://chrome.google.com/webstore/detail/apollo-client-developer-t/jdkknkkbebbapilgoeccciglkfbmbnfm
      connectToDevTools: true,

      // Custom resolver (items are resolved from the cache.
      // http://dev.apollodata.com/react/cache-updates.html#cacheRedirect
      // https://github.com/apollographql/apollo-client/blob/a86acf25df5eaf0fdaab264fd16c2ed22657e65c/test/customResolvers.ts
      // https://github.com/apollographql/apollo-client/blob/6b6e8ded1e0f83cb134d2261a3cf7d2d9416400f/src/data/storeUtils.ts
      customResolvers: {
        Query: {
          item: (_, args) => {
            return {
              type: 'id',
              id: args['itemId']  // GraphQL query-soecific.
            };
          }
        }
      }
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

    // Redux Reducers (Action handlers.)
    // NOTE: All reducers receive ALL application actions.
    // http://redux.js.org/docs/basics/Reducers.html

    // The Global reducer can access the entire state.
    // We use this to listen for specific Apollo actions and update the app's state (e.g., Navbar).
    // https://apollographql.slack.com/archives/general/p1487786940010712 (help from @pleunv).
    let global = this.globalReducer;

    // Combines system (Apollo, React Router) reducers with app-specific state reducers.
    // http://redux.js.org/docs/api/combineReducers.html
    let merged = combineReducers(_.merge(this.reducers, {

      //
      // React Redux Router.
      //
      routing: routerReducer,

      //
      // Apollo framework reducer.
      //
      apollo: this._apolloClient.reducer(),

    }));

    // https://github.com/acdlite/reduce-reducers
    // https://github.com/reactjs/redux/issues/749
    let reducers = global ? reduceReducers(merged, global) : merged;

    // Enhance the store.
    // https://github.com/reactjs/redux/blob/master/docs/Glossary.md#store-enhancer
    let enhancer = compose(

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
  }

  /**
   * React router.
   */
  initRouter() {

    // Enhanced history that syncs navigation events with the store.
    this._reduxHistory = syncHistoryWithStore(this.history, this._store);

    this.history.listen(location => {
      logger.log('Router: ' + location.pathname);
    });
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
   * Redux store (for dispatching actions).
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
   * Local item store.
   * @returns {ItemStore}
   */
  get itemStore() {
    return null;
  }

  /**
   * React router history.
   */
  get history() {
    return null;
  }

  /**
   * Global reducer for reduce-reducers.
   */
  get globalReducer() {
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
    logger.info($$('### [%s %s] ###', moment().format('hh:mm:ss'), _.get(this._config, 'env')));

    // Construct app.
    const app = (
      // TODO(burdon): Get injector from store?
      <App
        injector={ this._injector }
        history={ this._reduxHistory }
        client={ this._apolloClient }
        store={ this._store }/>
    );

    // Render app.
    let root = document.getElementById(this._config.root);
    ReactDOM.render(app, root);
    return root;
  }
}

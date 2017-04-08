//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { browserHistory, IndexRedirect, Redirect, Route, Router } from 'react-router'
import { ApolloProvider } from 'react-apollo';

import { Injector, Database, IdGenerator, Matcher, MemoryItemStore } from 'minder-core';

import { BaseApp } from '../common/base_app';
import { AppAction, AppReducer, GlobalAppReducer } from '../common/reducers';
import { AuthManager } from '../common/auth';
import { ConnectionManager } from '../common/client';
import { NetworkManager } from '../common/network';
import { FirebaseCloudMessenger } from '../common/cloud_messenger';

import { TypeRegistryFactory } from './framework/type_factory';

import { Path } from '../common/path';

import AdminActivity from './activity/admin';
import CanvasActivity from './activity/canvas';
import FinderActivity from './activity/finder';
import TestingActivity from './activity/testing';

/**
 * Base class for Web apps.
 */
export class WebApp extends BaseApp {

  /**
   * Apollo network.
   */
  initNetwork() {

    // Manages OAuth.
    this._authManager = new AuthManager(this._config);

    // FCM Push Messenger.
    this._cloudMessenger = new FirebaseCloudMessenger(this._config, this._eventHandler).listen(message => {
      if (_.get(this._config, 'options.invalidate')) {
        this._queryRegistry.invalidate();
      }
    });

    // Manages the client connection and registration.
    this._connectionManager = new ConnectionManager(this._config, this._authManager, this._cloudMessenger);

    // TODO(burdon): Local transient item store.
    /*
    let idGenerator = this._injector.get(IdGenerator);
    let matcher = this._injector.get(Matcher);
    this._itemStore = new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.LOCAL, false);
    */
    this._itemStore = null;

    // Apollo network requests.
    this._networkManager =
      new NetworkManager(this._config, this._authManager, this._connectionManager, this._eventHandler)
        .init(this._itemStore);
  }

  postInit() {

    // Register client.
    return this._authManager.authenticate().then(userProfile => {
      // Map to Segment well-known fields (https://segment.com/docs/spec/identify/#traits).
      let { id, email, displayName:name, photoUrl:avatar } = userProfile;
      this._analytics.identify(id, _.omitBy({ email, name, avatar }, _.isNil));

      // TODO(burdon): Retry?
      return this._connectionManager.register().then(client => {
        this.store.dispatch(AppAction.register(userProfile));
      });
    });
  }

  terminate() {
    // Unregister client.
    this._connectionManager && this._connectionManager.unregister();
  }

  get itemStore() {
    return this._itemStore;
  }

  get providers() {
    return [
      Injector.provider(TypeRegistryFactory())
    ];
  }

  get globalReducer() {
    return GlobalAppReducer;
  }

  get reducers() {
    return {
      // Main app reducer.
      // TODO(burdon): Push to BaseApp.
      [AppAction.namespace]: AppReducer(this._injector, this._config, this._apolloClient)
    }
  }

  get networkInterface() {
    return this._networkManager.networkInterface;
  }

  get history() {
    // https://github.com/ReactTraining/react-router/blob/master/docs/guides/Histories.md#browserhistory
    return browserHistory;
  }
}

/**
 * The Application must be a pure React component since HOCs may cause the component to be re-rendered,
 * which would trigger a Router warning.
 *
 * Activities are top-level components that set-up the context.
 */
export class Application extends React.Component {

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    history: React.PropTypes.object.isRequired,
    store: React.PropTypes.object.isRequired
  };

  render() {
    let { client, store, history } = this.props;

    // https://github.com/ReactTraining/react-router
    // TODO(burdon): onEnter/onLeave

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

            <Route path={ Path.ADMIN } component={ AdminActivity }/>
            <Route path={ Path.TESTING } component={ TestingActivity }/>

            {/*
              * /inbox
              * /favorites
              */}
            <Route path={ Path.route(['folder']) } component={ FinderActivity }/>

            {/*
              * /project/xxx
              * /project/board/xxx
              */}
            <Route path={ Path.route(['type', 'itemId']) } component={ CanvasActivity }/>
            <Route path={ Path.route(['type', 'canvas', 'itemId']) } component={ CanvasActivity }/>

            <Redirect from='*' to={ Path.HOME }/>
          </Route>

        </Router>

      </ApolloProvider>
    );
  }
}

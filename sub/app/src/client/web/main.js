//
// Copyright 2016 Minder Labs.
//

import { DomUtil } from 'minder-core';
import { browserHistory } from 'react-router'

import { Injector } from 'minder-core';

import { Const } from '../../common/defs';

import { BaseApp } from '../common/base_app';
import { AppAction, AppReducer, GlobalAppReducer } from '../common/reducers';
import { AuthManager } from '../common/auth';
import { ConnectionManager } from '../common/client';
import { NetworkManager } from '../common/network';
import { PushManager } from '../common/push';

import { TypeRegistryFactory } from './framework/type_factory';
import { Application } from './app';

import './config';

/**
 * Configuration (from server).
 */
const config = _.defaultsDeep(window.config, {

  debug: (window.config.env !== 'production'),

  app: {
    platform: DomUtil.isMobile() ? Const.PLATFORM.MOBILE : Const.PLATFORM.WEB
  }
});

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

    // Wraps the Apollo network requests.
    this._networkManager = new NetworkManager(this._config, this._authManager, this._eventHandler).init();

    // FCM manager.
    this._pushManager = new PushManager(this._config, this._queryRegistry, this._eventHandler);

    // Manages the client connection and registration.
    this._connectionManager =
      new ConnectionManager(this._config, this._authManager, this._pushManager, this._eventHandler);
  }

  terminate() {
    // Unregister client.
    return this._connectionManager.unregister();
  }

  get providers() {
    return [
      Injector.provider(TypeRegistryFactory())
    ]
  }

  get globalReducer() {
    return GlobalAppReducer;
  }

  get reducers() {
    return {
      // Main app reducer.
      [AppAction.namespace]: AppReducer(this._injector, this._config)
    }
  }

  get networkInterface() {
    return this._networkManager.networkInterface;
  }

  get history() {
    // https://github.com/ReactTraining/react-router/blob/master/docs/guides/Histories.md#browserhistory
    return browserHistory;
  }

  postInit() {

    // Register client.
    return this._authManager.authenticate().then(user => {

      // TODO(burdon): Retry?
      return this._connectionManager.register().then(registration => {
        this.store.dispatch(AppAction.register(registration));
      });
    });
  }
}

const bootstrap = new WebApp(config);

//
// React Hot Loader (3)
// https://github.com/gaearon/react-hot-boilerplate/pull/61
// https://webpack.github.io/docs/hot-module-replacement.html
//

if (module.hot && _.get(config, 'env') === 'hot') {

  // TODO(burdon): Factor out path.
  // List modules that can be dynamically reloaded.
  module.hot.accept('./app', () => {
    const App = require('./app').default;
    bootstrap.render(App);
  });
}

//
// CLean-up
// https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
//

window.addEventListener('beforeunload', event => {
  // Ask user (system message is used).
  // TODO(burdon): Check for unsaved data.
  if (false) {
    event.returnValue = 'Leave minder?';
  }
});
window.addEventListener('unload', () => {
  bootstrap.terminate();
});

//
// Start app.
//

bootstrap.init().then(() => {
  bootstrap.render(Application);
});

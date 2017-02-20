//
// Copyright 2016 Minder Labs.
//

import { DomUtil } from 'minder-core';
import { browserHistory } from 'react-router'

import { Injector } from 'minder-core';

import { Const } from '../../common/defs';

import { BaseApp } from '../common/base_app';
import { AppAction, AppReducer } from '../common/reducers';
import { ClientAuthManager, ConnectionManager, NetworkManager } from '../common/network';

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

    // Wraps the Apollo network requests.
    this._networkManager = new NetworkManager(this._config, this._eventHandler).init();

    // Manages the client connection and registration.
    this._connectionManager =
      new ConnectionManager(this._config, this._networkManager, this._queryRegistry, this._eventHandler);

    // Manages OAuth.
    this._authManager = new ClientAuthManager(this._config, this._networkManager, this._connectionManager);
    return this._authManager.authenticate().then(registration => {
      this._registration = registration;
    })
  }

  get registration() {
    return this._registration;
  }

  get providers() {
    return [
      Injector.provider(TypeRegistryFactory())
    ]
  }

  get reducers() {
    return {
      // Main app reducer.
      [AppAction.namespace]: AppReducer(this._injector, this._config, this._registration)
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
// Start app.
//

bootstrap.init().then(() => {
  bootstrap.render(Application);
});

//
// Copyright 2016 Minder Labs.
//

import { DomUtil } from 'minder-core';

import { WebBase } from './base';
import { AppAction, AppReducer } from './reducers';
import Application from './app';

// TODO(burdon): ???????????????????????????
// NOTE: Must come first.
import './config';

/**
 * Configuration (from server).
 */
const config = _.defaultsDeep(window.config, {

  // TODO(burdon): Set by server?
  debug: (window.config.env !== 'production'),
  app: {
    platform: DomUtil.isMobile() ? 'mobile': 'web'
  }
});

/**
 * Main app.
 */
class WebApp extends WebBase {

  get reducers() {
    return {

      // Main app reducer.
      [AppAction.namespace] : AppReducer(this._serverProvider, this._injector)
    }
  }
}

const bootstrap = new WebApp(config);

//
// React Hot Loader (3)
// https://github.com/gaearon/react-hot-boilerplate/pull/61
// https://webpack.github.io/docs/hot-module-replacement.html
//

if (module.hot && _.get(config, 'env') === 'hot') {

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

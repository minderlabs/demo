//
// Copyright 2016 Minder Labs.
//

import { DomUtil } from 'minder-core';

import { Const } from '../../common/const';

import { WebApp, Application } from './app';

import AnalyticsConfig from 'json-loader!yaml-loader!../../../conf/analytics.yml';
import FirebaseConfig from 'json-loader!yaml-loader!../../../conf/firebase/minder-beta.yml';

import './config';

/**
 * Configuration (from server).
 */
const config = _.defaultsDeep(window.config, {

  analytics: AnalyticsConfig,
  firebase: FirebaseConfig,

  debug: (window.config.env !== 'production'),

  // Framework debug options.
  options: {
    reducer: true,
    optimistic: true,
    invalidation: true,
    networkDelay: 0
  },

  app: {
    platform: DomUtil.isMobile() ? Const.PLATFORM.MOBILE : Const.PLATFORM.WEB
  }
});

//
// App instance.
//

const app = new WebApp(config);

//
// React Hot Loader.
// https://github.com/gaearon/react-hot-boilerplate/pull/61
// https://webpack.github.io/docs/hot-module-replacement.html
//

if (module.hot && _.get(config, 'env') === 'hot') {
  // TODO(burdon): Factor out path.
  // List modules that can be dynamically reloaded.
  module.hot.accept('./app', () => {
    const App = require('./app').default;
    app.render(App);
  });
}

//
// Prevent/warn unload.
// https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
//

window.addEventListener('beforeunload', event => {
  // TODO(burdon): Check for unsaved data.
  if (false) {
    // NOTE: On Chrome the system message cannot be overridden.
    event.returnValue = 'Leave minder?';
  }
});

window.addEventListener('unload', () => {
  // Unregister from BG page.
  app.terminate();
});

//
// Start app.
//

app.init().then(() => {
  app.render(Application);
});

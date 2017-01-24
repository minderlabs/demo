//
// Copyright 2016 Minder Labs.
//

import { Base } from './base';

import { AppAction, AppReducer } from './reducers';

import Application from './app';

const config = window.config;

/**
 * Main app.
 */
class Minder extends Base {

  get reducers() {
    return {

      // Main app reducer.
      [AppAction.namespace] : AppReducer(this.config, this.injector)
    }
  }
}

const bootstrap = new Minder(config);

//
// React Hot Loader (3)
// https://github.com/gaearon/react-hot-boilerplate/pull/61
// https://webpack.github.io/docs/hot-module-replacement.html
//

if (module.hot && _.get(config, 'debug.env') === 'hot') {

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

  console.log('>>>>>>>>>>>>>>>>', bootstrap.store.getState());

  bootstrap.render(Application);
});

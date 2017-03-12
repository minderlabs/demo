//
// Copyright 2017 Minder Labs.
//

import { Const } from '../../common/defs';

import { AppAction, AppReducer, ContextAction, ContextReducer } from '../common/reducers';
import { WebApp } from '../web/app';

import { SidebarAction, SidebarReducer } from './sidebar/reducers';
import { Application } from './sidebar/app';

/**
 * Test sidebar app (enable testing within DOM).
 */
class TestSidebarApp extends WebApp {

  get reducers() {
    return {
      // Main app.
      [AppAction.namespace]: AppReducer(this._injector, this._config),

      // Context.
      [ContextAction.namespace]: ContextReducer,

      // Sidebar-specific.
      [SidebarAction.namespace]: SidebarReducer
    }
  }
}

//
// Test config.
//

const config = _.assign(window.config, {
  debug: true,
  app: {
    platform: Const.PLATFORM.CRX
  }
});

const app = new TestSidebarApp(config);

module.hot.accept('./sidebar/app', () => {
  const App = require('./sidebar/app').default;
  app.render(App);
});

app.init().then(() => {
  app.render(Application);
});
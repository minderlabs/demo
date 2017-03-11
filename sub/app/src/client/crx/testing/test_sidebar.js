//
// Copyright 2017 Minder Labs.
//

import { Injector } from 'minder-core';

import { Const } from '../../../common/defs';

import { TypeRegistryFactory } from '../../web/framework/type_factory';

import { Application, SidebarApp } from '../sidebar/app';

/**
 * Test sidebar app (extend to enable testing within DOM).
 */
class TestSidebarApp extends SidebarApp {

  get providers() {
    return [
      Injector.provider(TypeRegistryFactory()),
      Injector.provider(this._messenger)
    ]
  }

  // TODO(burdon): From main web.
  initNetwork() {
    return Promise.resolve();
  }

  // TODO(burdon): From main web.
  postInit() {
    return Promise.resolve();
  }
}

//
// Test config.
//

const config = _.defaultsDeep(window.config, {
  debug: true,
  channel: 'testing',
  app: {
    platform: Const.PLATFORM.CRX
  }
});

const bootstrap = new TestSidebarApp(config);

module.hot.accept('../sidebar/app', () => {
  const App = require('../sidebar/app').default;
  bootstrap.render(App);
});

bootstrap.init().then(() => {
  bootstrap.render(Application);
});

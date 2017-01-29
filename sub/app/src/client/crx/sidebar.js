//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'reducer': Logger.Level.debug,
}, Logger.Level.info);

import { createMemoryHistory } from 'react-router';

import {
  ChromeMessageChannel, ChromeMessageChannelRouter, WindowMessenger, HttpUtil, Injector, KeyListener
} from 'minder-core';

import { Base } from '../web/base';
import { Path } from '../web/path';
import { AppAction, AppReducer } from '../web/reducers';

import { KeyToggleSidebar } from './common';
import { ChromeNetworkInterface } from './util/network';
import { SidebarAction, SidebarReducer } from './sidebar/reducers';

import Application from './sidebar/app';

//
// Config passed from content script container.
// TODO(burdon): Document config object.
//
const config = _.merge({
  root: 'crx-root',
  env: 'development',

  app: {
    name: 'Minder',
    version: '0.1.1',
    platform: 'crx'
  },

  // Set by server registration with background page.
  team: 'minderlabs',
  user: {}

}, HttpUtil.parseUrlArgs());

/**
 * Main sidebar app.
 */
class Sidebar extends Base {

  constructor(config) {
    super(config);

    // TODO(burdon): Get message/event when opened/closed by key press (to update state).
    this._messenger = new WindowMessenger(config.channel)
      .attach(parent)
      .listen(message => {
        switch (message.command) {
          case 'UPDATE':
            this.store.dispatch(SidebarAction.update(message.events));
            break;

          default:
            console.warning('Invalid command: ' + JSON.stringify(message));
        }
      });

    // Message routing.
    this._router = new ChromeMessageChannelRouter();
    this._systemChannel = new ChromeMessageChannel('system', this._router);

    // React Router history.
    this._history = createMemoryHistory(Path.HOME);
  }

  postInit() {
    this._router.connect();

    // Register the client witht the background page.
    return this._systemChannel.postMessage({
      command: 'register'
    }).wait().then(response => {
      this.store.dispatch(AppAction.register(response.value.user));
    });
  }

  initNetwork() {
    this._networkInterface = new ChromeNetworkInterface(
      new ChromeMessageChannel(ChromeNetworkInterface.CHANNEL, this._router), this._eventHandler);

    // TODO(burdon): Wait for connection.
    return Promise.resolve();
  }

  get networkInterface() {
    return this._networkInterface;
  }

  get history() {
    return this._history;
  }

  get providers() {
    return [
      Injector.provider(this._messenger),
      Injector.provider(this._systemChannel, 'system-channel')
    ]
  }

  get reducers() {
    return {
      // Main app.
      [AppAction.namespace]: AppReducer(this._config, this._injector),

      // Sidebar-specific.
      [SidebarAction.namespace]: SidebarReducer(this._config, this._injector)
    }
  }
}

//
// Root application.
//
const bootstrap = new Sidebar(config);

bootstrap.init().then(() => {

  bootstrap.render(Application);
//bootstrap.render(TestApplication);

  // Trigger startup via Redux.
  bootstrap.store.dispatch(SidebarAction.init());

  const keyBindings = new KeyListener()
    .listen(KeyToggleSidebar, () => bootstrap.store.dispatch(SidebarAction.toggle()));
});

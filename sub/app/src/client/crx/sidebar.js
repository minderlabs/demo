//
// Copyright 2017 Minder Labs.
//

// NOTE: Must come first.
import './config';

import {
  ChromeMessageChannel, ChromeMessageChannelRouter, WindowMessenger, HttpUtil, Injector, KeyListener
} from 'minder-core';

import { Base } from '../web/base';
import { AppAction, AppReducer } from '../web/reducers';

import { KeyToggleSidebar } from './common';
import { ChromeNetworkInterface } from './util/network';
import { SidebarAction, SidebarReducer } from './sidebar/reducers';

import Application from './sidebar/app';

// TODO(burdon): Document config.
// Config passed from content script container.
const config = _.merge({

  app: {
    name: 'Minder',
    version: '0.1.0',
    platform: 'crx'
  },

  debug: {
    env: 'development'
  },

  graphql: '/graphql',

  root: 'crx-root',

  team: 'minderlabs',

  // TODO(burdon): Get auth (userInfo): see server/app.
  user: {}

}, HttpUtil.parseUrlArgs());

/**
 * Main sidebar app.
 */
class Sidebar extends Base {

  constructor(config) {
    super(config);

    // TODO(burdon): Get message/event when opened/closed by key press (to update state).
    this.messenger = new WindowMessenger(config.channel)
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
    this.router = new ChromeMessageChannelRouter();
    this.systemChannel = new ChromeMessageChannel('system', this.router);
  }

  postInit() {
    this.router.connect();
    return Promise.resolve();
  }

  initNetwork() {
    this.networkInterface =
      new ChromeNetworkInterface(
        new ChromeMessageChannel(ChromeNetworkInterface.CHANNEL, this.router),
      this.eventHandler);

    // TODO(burdon): Wait for connection.
    return Promise.resolve();
  }

  get providers() {
    return [
      Injector.provider(this.messenger),
      Injector.provider(this.systemChannel, 'system-channel')
    ]
  }

  get reducers() {
    return {
      // Main app.
      [AppAction.namespace]: AppReducer(this.config, this.injector),

      // Sidebar-specific.
      [SidebarAction.namespace]: SidebarReducer(this.config, this.injector)
    }
  }
}

const bootstrap = new Sidebar(config);

bootstrap.init().then(() => {

  // Init UX.
//bootstrap.render(TestApplication);
  bootstrap.render(Application);

  // Trigger startup via Redux.
  bootstrap.store.dispatch(SidebarAction.init());

  const keyBindings = new KeyListener()
    .listen(KeyToggleSidebar, () => bootstrap.store.dispatch(SidebarAction.toggle()));
});

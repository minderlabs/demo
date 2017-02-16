//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'reducer': Logger.Level.debug,
}, Logger.Level.info);

import { createMemoryHistory } from 'react-router';

import PreventParentScoll from 'prevent-parent-scroll';

import {
  ChromeMessageChannel, ChromeMessageChannelRouter, WindowMessenger, HttpUtil, Injector, KeyListener
} from 'minder-core';

import { Base } from '../web/base';
import { Path } from '../web/path';
import { AppAction, AppReducer, ContextAction, ContextReducer } from '../web/reducers';

import { BackgroundCommand, SidebarCommand, KeyToggleSidebar } from './common';
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
    version: '0.0.0',     // TODO(burdon): Get from manifest.
    platform: 'crx'
  },

  // Set by server registration with background page.
  userId: null,
  groupId: null

}, HttpUtil.parseUrlArgs());

/**
 * Main sidebar app.
 */
class SidebarApp extends Base {

  constructor(config) {
    super(config);

    // React Router history.
    this._history = createMemoryHistory(Path.HOME);

    //
    // Messages from Content Script.
    //
    this._messenger = new WindowMessenger(config.channel)
      .attach(parent)
      .listen(message => {
        switch (message.command) {

          // Updated visibility.
          case SidebarCommand.UPDATE_VISIBILITY:
            this.store.dispatch(SidebarAction.updateVisibility(message.visible));
            break;

          // Updated context from Content Script.
          case SidebarCommand.UPDATE_CONTEXT:
            this.store.dispatch(ContextAction.updateContext(message.context));
            break;

          default:
            console.warn('Invalid command: ' + JSON.stringify(message));
        }
      });

    //
    // Messages from Background Page.
    //
    this._router = new ChromeMessageChannelRouter();
    this._systemChannel = new ChromeMessageChannel('system', this._router);
    this._systemChannel.onMessage.addListener(message => {
      switch (message.command) {

        // Reset Apollo client (flush cache); e.g., Backend re-connected.
        case BackgroundCommand.RESET: {
          this.resetStore();
          break;
        }

        default:
          console.warn('Invalid command: ' + JSON.stringify(message));
      }
    });
  }

  postInit() {
    this._router.connect();

    // Register the client with the background page.
    return this._systemChannel.postMessage({
      command: BackgroundCommand.REGISTER
    }).wait().then(response => {
      // TODO(burdon): Retry if not registered (server might not be responding).
      console.assert(response.server && response.user);
      this.store.dispatch(AppAction.register(response.server, response.userId, response.groupId));
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

      // Context.
      [ContextAction.namespace]: ContextReducer,

      // Sidebar-specific.
      [SidebarAction.namespace]: SidebarReducer
    }
  }
}

//
// Root application.
//
const bootstrap = new SidebarApp(config);

bootstrap.init().then(() => {

  let root = bootstrap.render(Application);
//bootstrap.render(TestApplication);

  // TODO(burdon): Dynamically set on scroll container (on mouseover?)
  // https://www.npmjs.com/package/prevent-parent-scroll
  /*
  let preventParentScroll = new PreventParentScoll(root);
  preventParentScroll.start();
  */

  // Trigger startup via Redux.
  bootstrap.store.dispatch(SidebarAction.initialized());

  const keyBindings = new KeyListener()
    .listen(KeyToggleSidebar, () => bootstrap.store.dispatch(SidebarAction.toggleVisibility()));
});

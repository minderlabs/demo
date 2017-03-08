//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({
  'reducer': Logger.Level.debug,
}, Logger.Level.info);

import { createMemoryHistory } from 'react-router';

import {
  Async, ErrorUtil, HttpUtil, Injector, KeyListener,
  ChromeMessageChannel, ChromeMessageChannelRouter, WindowMessenger
} from 'minder-core';

import { Path } from '../common/path';
import { BaseApp } from '../common/base_app';
import { AppAction, AppReducer, ContextAction, ContextReducer } from '../common/reducers';

import { Const } from '../../common/defs';

import { TypeRegistryFactory } from '../web/framework/type_factory';

import { BackgroundCommand, SidebarCommand, KeyCodes } from './common';
import { ChromeNetworkInterface } from './util/network';
import { SidebarAction, SidebarReducer } from './sidebar/reducers';
import { Application } from './sidebar/app';

// TODO(burdon): Catch errors (notify content script).

//
// Config passed from content script container.
//
const config = _.merge({
  root: Const.DOM_ROOT,

  // TODO(burdon): Build option (based on CRX ID?)
  env: 'development',

  app: {
    platform: Const.PLATFORM.CRX,
    name: Const.APP_NAME
  }

}, HttpUtil.parseUrlArgs());

/**
 * Main sidebar app.
 */
class SidebarApp extends BaseApp {

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
        console.log('Command: ' + JSON.stringify(message));
        switch (message.command) {

          // Updated visibility.
          case SidebarCommand.UPDATE_VISIBILITY: {
            this.store.dispatch(SidebarAction.updateVisibility(message.visible));
            break;
          }

          // Updated context from Content Script.
          case SidebarCommand.UPDATE_CONTEXT: {
            this.store.dispatch(ContextAction.updateContext(message.context));
            break;
          }

          default: {
            console.warn('Invalid command: ' + JSON.stringify(message));
          }
        }
      });

    //
    // Messages from Background Page.
    //

    this._router = new ChromeMessageChannelRouter();
    this._systemChannel = new ChromeMessageChannel(BackgroundCommand.CHANNEL, this._router);
    this._systemChannel.onMessage.addListener(message => {
      console.log('Command: ' + JSON.stringify(message));
      switch (message.command) {

        // Reset Apollo client (flush cache); e.g., Backend re-connected.
        case BackgroundCommand.FLUSH_CACHE: {
          this.resetStore();
          break;
        }

        default: {
          console.warn('Invalid command: ' + JSON.stringify(message));
        }
      }
    });
  }

  initNetwork() {
    this._networkInterface = new ChromeNetworkInterface(
      new ChromeMessageChannel(ChromeNetworkInterface.CHANNEL, this._router), this._eventHandler);

    return Promise.resolve();
  }

  /**
   * Register with BG page.
   */
  postInit() {
    // Connect the message channel.
    this._router.connect();

    // Register with the background page to obtain the CRX registration (userId, clientId) and server.
    // NOTE: Retry in case background page hasn't registered with the server yet (race condition).
    console.log('Registering with background page...');
    return Async.retry(() => {
      return this._systemChannel.postMessage({
        command: BackgroundCommand.REGISTER_APP
      }, true)
        .then(({ registration, server }) => {
          console.assert(registration && server);
          console.log('Registered: ' + JSON.stringify(registration));

          // Initialize the app.
          this.store.dispatch(AppAction.register(registration, server));

          // Notify the content script.
          this._messenger.postMessage({ command: SidebarCommand.INITIALIZED });
        });
    });
  }

  get networkInterface() {
    return this._networkInterface;
  }

  get history() {
    return this._history;
  }

  get providers() {
    return [
      Injector.provider(TypeRegistryFactory()),
      Injector.provider(this._messenger),
      Injector.provider(this._systemChannel, 'system-channel')
    ]
  }

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
// Root application.
//
const bootstrap = new SidebarApp(config);

bootstrap.init().then(() => {

  bootstrap.render(Application);

  // TODO(burdon): Dynamically set on scroll container (on mouseover?)
  // https://www.npmjs.com/package/prevent-parent-scroll
  /*
  let preventParentScroll = new PreventParentScoll(root);
  preventParentScroll.start();
  */

  new KeyListener()
    .listen(KeyCodes.TOGGLE, () => bootstrap.store.dispatch(SidebarAction.toggleVisibility()));
});

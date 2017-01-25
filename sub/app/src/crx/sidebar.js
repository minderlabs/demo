//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { Provider } from 'react-redux';

import { HttpUtil, KeyListener } from 'minder-core';

import { Base } from '../client/base';
import { AppAction, AppReducer } from '../client/reducers';

import { KeyToggleSidebar } from './common';
import { FrameMessenger } from './util/messenger';
import { ChromeMessageChannel, ChromeMessageChannelRouter, ChromeNetworkInterface } from './util/network';
import { SidebarActions, SidebarReducer } from './components/sidebar_reducers';
import SidebarPanel from './components/sidebar_panel';

// TODO(burdon): Test React/Apollo (network/auth).

// Config passed from content script container.
const config = _.merge({

  app: {
    name: 'Minder',
    version: '0.1.0'
  },

  debug: {},

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
    this.messenger = new FrameMessenger(config.channel)
      .attach(parent)
      .listen(message => {
        switch (message.command) {
          case 'UPDATE':
            this.store.dispatch(SidebarActions.update(message.events));
            break;

          default:
            console.warning('Invalid command: ' + JSON.stringify(message));
        }
      });
  }

  initNetwork() {
    let router = new ChromeMessageChannelRouter().connect();

    this.networkInterface =
      new ChromeNetworkInterface(
        new ChromeMessageChannel(ChromeNetworkInterface.CHANNEL, router));
  }

  get reducers() {
    return {
      // Main app.
      [AppAction.namespace] : AppReducer(this.config, this.injector),

      // Sidebar-specific.
      [SidebarActions.namespace]: SidebarReducer(this.messenger)
    }
  }
}

const bootstrap = new Sidebar(config);

/**
 * TODO(burdon): Temporary root application.
 */
class Application extends React.Component {

  render() {
    return (
      <Provider store={ this.props.store }>
        <SidebarPanel/>
      </Provider>
    );
  }
}

bootstrap.init().then(() => {

  // Init UX.
  bootstrap.render(Application);

  // Trigger startup via Redux.
  bootstrap.store.dispatch(SidebarActions.init());

  const keyBindings = new KeyListener()
    .listen(KeyToggleSidebar, () => bootstrap.store.dispatch(SidebarActions.toggle()));
});

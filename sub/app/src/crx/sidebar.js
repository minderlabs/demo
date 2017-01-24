//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import { HttpUtil, KeyListener } from 'minder-core';

import { Base } from '../client/base';
import { AppAction, AppReducer } from '../client/reducers';

import { KeyToggleSidebar } from './common';
import { Messenger } from './util/messenger';
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

//
// Event handling.
//

// TODO(burdon): Get message/event when opened/closed by key press (to update state).
const messenger = new Messenger(config.channel)
  .attach(parent)
  .listen(message => {
    switch (message.command) {
      case 'UPDATE':
        store.dispatch(SidebarActions.update(message.events));
        break;

      default:
        console.warning('Invalid command: ' + JSON.stringify(message));
    }
  });

const keyBindings = new KeyListener()
  .listen(KeyToggleSidebar, () => store.dispatch(SidebarActions.toggle()));

//
// Redux set-up.
//

// http://redux.js.org/docs/api/createStore.html
// const store = createStore(combineReducers({
//   [SidebarActions.namespace]: SidebarReducer(messenger)
// }));

// TODO(burdon): Create react-router demo (with onEnter).
// https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store

class Application extends React.Component {

  render() {
    return (
      <Provider store={ this.props.store }>
        <SidebarPanel/>
      </Provider>
    );
  }
}

// https://facebook.github.io/react/docs/react-dom.html
//ReactDOM.render(RootApp, document.getElementById('crx-root'));


/**
 * Main sidebar app.
 */
class Sidebar extends Base {

  get reducers() {
    return {
      // Main app.
      [AppAction.namespace] : AppReducer(this.config, this.injector),

      // Sidebar-specific.
      [SidebarActions.namespace]: SidebarReducer(messenger)
    }
  }
}

const bootstrap = new Sidebar(config);

bootstrap.init().then(() => {

  // Init UX.
  bootstrap.render(Application);

  // Trigger startup via Redux.
  bootstrap.store.dispatch(SidebarActions.init());
});

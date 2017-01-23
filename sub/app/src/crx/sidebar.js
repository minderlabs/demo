//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import { HttpUtil, KeyListener } from 'minder-core';

import { KeyToggleSidebar } from './common';
import { Messenger } from './util/messenger';
import { SidebarActions, SidebarReducer } from './components/sidebar_reducers';
import SidebarPanel from './components/sidebar_panel';

// TODO(burdon): Test React/Apollo (network/auth).
// TODO(burdon): Common guts with App (just different layout and configuration). E.g., common testing.
// TODO(burdon): Get message/event when opened/closed by key press (to update state).

// Config passed from content script container.
const config = HttpUtil.parseUrlArgs();

//
// Event handling.
//

const messenger = new Messenger(config.channel)
  .attach(parent)
  .listen(message => {
    switch (message.command) {
      case 'UPDATE':
        // TODO(burdon): Remove duplicates.
        store.dispatch(SidebarActions.update(_.uniqBy(message.events, 'email')));
        break;

      default:
        console.warning('Invalid command: ' + JSON.stringify(message));
    }
  });

const keyBindings = new KeyListener()
  .listen(KeyToggleSidebar, () => store.dispatch(SidebarActions.toggle()));

//
// Redux set-up.
// TODO(burdon): Create react-router demo (with onEnter).
// https://github.com/ReactTraining/react-router/blob/master/docs/API.md#onenternextstate-replace-callback
//

// http://redux.js.org/docs/api/createStore.html
const store = createStore(combineReducers({
  [SidebarActions.namespace]: SidebarReducer(messenger)
}));

// https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store
const RootApp = (
  <Provider store={ store }>
    <SidebarPanel/>
  </Provider>
);

// https://facebook.github.io/react/docs/react-dom.html
ReactDOM.render(RootApp, document.getElementById('crx-root'));

// Trigger startup via Redux.
store.dispatch(SidebarActions.init());

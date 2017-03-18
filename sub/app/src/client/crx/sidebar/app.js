//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { createMemoryHistory, IndexRedirect, Redirect, Route, Router } from 'react-router'
import { ApolloProvider } from 'react-apollo';

import { Async, Injector, ChromeMessageChannel, ChromeMessageChannelRouter, WindowMessenger } from 'minder-core';

import { Path } from '../../common/path';
import { BaseApp } from '../../common/base_app';
import { ChromeNetworkInterface } from '../../common/network';
import { AppAction, AppReducer, ContextAction, ContextReducer } from '../../common/reducers';
import { TypeRegistryFactory } from '../../web/framework/type_factory';

import { SystemChannel, SidebarCommand } from '../common';
import { SidebarAction, SidebarReducer } from '../sidebar/reducers';

import FinderActivity from '../../web/activity/finder';

/**
 * Main sidebar app.
 */
export class SidebarApp extends BaseApp {

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
            // FIXME: not seeing this. Where do these console logs go?
            if (message.visible) {
              this._analytics && this._analytics.track('sidebar.open');
            }
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
    // Channel to background page.
    //

    this._router = new ChromeMessageChannelRouter();
    this._systemChannel = new ChromeMessageChannel(SystemChannel.CHANNEL, this._router);

    // Proxy to BG page.
    this._networkInterface = null;
  }

  onError(error) {
    super.onError(error);

    // Relay to content script.
    this._messenger.postMessage({ command: SidebarCommand.ERROR, error });
  }

  initNetwork() {

    // Connect to background page.
    this._router.connect();

    // System commands form background page.
    this._systemChannel.onMessage.addListener(message => {
      console.log('Command: ' + JSON.stringify(message));
      switch (message.command) {

        // Reset Apollo client (flush cache); e.g., Backend re-connected.
        case SystemChannel.FLUSH_CACHE: {
          this.resetStore();
          break;
        }

        // Invalidate queries.
        case SystemChannel.INVALIDATE: {
          this._queryRegistry.invalidate();
          break;
        }

        default: {
          console.warn('Invalid command: ' + JSON.stringify(message));
        }
      }
    });

    // Proxy to BG page.
    this._networkInterface = new ChromeNetworkInterface(
      new ChromeMessageChannel(ChromeNetworkInterface.CHANNEL, this._router), this._eventHandler);
  }

  postInit() {

    // Register with the background page to obtain the CRX registration (userId, clientId) and server.
    // NOTE: Retry in case background page hasn't registered with the server yet (race condition).
    console.log('Getting registration...');
    return Async.retry(() => {
      return this._systemChannel.postMessage({
        command: SystemChannel.REQUEST_REGISTRATION
      }, true)
        .then(({ registration, server }) => {
          console.assert(registration && server);
          console.log('Registered: ' + JSON.stringify(registration));

          this._analytics && this._analytics.identify(registration.userId);

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
      Injector.provider(this._systemChannel, SystemChannel.CHANNEL)
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

/**
 * The Application must be a pure React component since HOCs may cause the component to be re-rendered,
 * which would trigger a Router warning.
 *
 * Activities are top-level components that set-up the context.
 */
export class Application extends React.Component {

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    history: React.PropTypes.object.isRequired,
    store: React.PropTypes.object.isRequired
  };

  render() {
    let { client, store, history } = this.props;

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

            <Route path={ Path.route(['folder']) } component={ FinderActivity }/>

            <Redirect from='*' to={ Path.HOME }/>
          </Route>

        </Router>

      </ApolloProvider>
    );
  }
}

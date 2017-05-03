//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { createMemoryHistory, IndexRedirect, Redirect, Route, Router } from 'react-router'
import { ApolloProvider } from 'react-apollo';
import PropTypes from 'prop-types';

import { 
  Async, Injector, ChromeMessageChannel, ChromeMessageChannelRouter, Logger, WindowMessenger 
} from 'minder-core';

import { Path } from '../../common/path';
import { BaseApp } from '../../common/base_app';
import { ChromeNetworkInterface } from '../../common/network';
import { AppAction, AppReducer, ContextAction, ContextReducer } from '../../common/reducers';
import { TypeRegistryFactory } from '../../web/framework/type_factory';

import { SystemChannel, SidebarCommand } from '../common';
import { SidebarAction, SidebarReducer } from '../sidebar/reducers';

import FinderActivity from '../../web/activity/finder';

const logger = Logger.get('sidebar');

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
        logger.log('Command: ' + JSON.stringify(message));

        switch (message.command) {

          // Updated visibility.
          case SidebarCommand.UPDATE_VISIBILITY: {
            if (!this.initialized) {
              break;
            }

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

    // System commands from background page.
    this._systemChannel.onMessage.addListener(message => {
      logger.log('Command: ' + JSON.stringify(message));
      switch (message.command) {

        // Reset Apollo client (flush cache); e.g., Backend re-connected.
        case SystemChannel.RESET: {
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
    logger.log('Registering client...');
    return Async.retry(() => {
      return this._systemChannel.postMessage({
        command: SystemChannel.REGISTER
      }, true)
        .then(({ userProfile, server }) => {
          console.assert(userProfile && server);
          logger.log('Registered: ' + JSON.stringify(userProfile));

          // Init analytics with the current user.
          this._analytics && this._analytics.identify(userProfile.id);

          // Initialize the app.
          this.store.dispatch(AppAction.register(userProfile, server));

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
      Injector.provide(TypeRegistryFactory()),
      Injector.provide(this._messenger),
      Injector.provide(this._systemChannel, SystemChannel.CHANNEL)
    ]
  }

  get reducers() {
    return {
      // Main app.
      // TODO(burdon): Push to BaseApp.
      [AppAction.namespace]: AppReducer(this.injector, this.config, this.client),

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
    injector: PropTypes.object.isRequired,
    client: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    store: PropTypes.object.isRequired
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

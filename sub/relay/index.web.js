//
// Copyright 2016 Minder Labs.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';

import io from 'socket.io-client';

import moment from 'moment';

import Application from './js/app/web/app';
import EventHandler from './js/app/web/util/event';
import SubscriptionManager from './js/app/web/util/subscriptions';
import Config from './js/app/web/util/config';


//
// App config.
// NOTE: Don't remove VERSION (needed dependency to trigger webpack on schema changes).
//

import { VERSION } from './js/common/data/schema';

Config.set('debug.schema', VERSION);

console.log('Config = %s', String(Config));


//
// Event handling.
//

const eventHandler = new EventHandler();

window.addEventListener('error', (error) => {
  eventHandler.emit({
    type: 'error',
    message: error.message
  });
});


//
// Set network layer.
// NOTE: See looging in Chrome React devtools (can copy queries into GraphiQL).
// https://facebook.github.io/relay/docs/api-reference-relay.html#injectnetworklayer-static-method
// TODO(burdon): Inject logger.
//

const environment = new Relay.Environment();

environment.injectNetworkLayer(Config.getNetworkLayer(eventHandler));


//
// Subscriptions.
//

const subscriptionManager = new SubscriptionManager();


//
// Socket
// http://socket.io/get-started/chat
// http://socket.io/docs
//

let socket = io();

socket.on('invalidate', (data) => {
  subscriptionManager.invalidate();
});


/**
 * Renders the application.
 * @param App Root component.
 */
function renderApp(App) {
  console.log('### [%s] ###', moment().format('hh:mm:ss'));

  ReactDOM.render(
    <App config={ Config }
         environment={ environment }
         subscriptionManager = { subscriptionManager }
         eventHandler={ eventHandler }/>,

    document.getElementById(Config.get('root'))
  );
}


//
// React Hot Loader (3)
// https://github.com/gaearon/react-hot-boilerplate/pull/61
// https://webpack.github.io/docs/hot-module-replacement.html
//

if (module.hot && Config.get('debug.env') === 'hot') {

  // List modules that can be dynamically reloaded.
  module.hot.accept('./js/app/web/app', () => {
    renderApp(require('./js/app/web/app').default);
  });
}


//
// Start app.
//

renderApp(Application);

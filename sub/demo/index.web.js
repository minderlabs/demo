//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import moment from 'moment';

import Application from './js/app/web/app';
import ErrorHandler from './js/app/web/util/error';
import Config from './js/app/web/util/config';


//
// App config.
// NOTE: Don't remove VERSION (needed dependency to trigger webpack on schema changes).
//

import { VERSION } from './js/common/data/schema';

Config.set('debug.schema', VERSION);

console.log('Config = %s', String(Config));


//
// Error handling.
// TODO(burdon): Change to system event handler/listener/logger.
//

const errorHandler = ErrorHandler.init();


//
// Set network layer.
// NOTE: See looging in Chrome React devtools (can copy queries into GraphiQL).
// https://facebook.github.io/relay/docs/api-reference-relay.html#injectnetworklayer-static-method
// TODO(burdon): Inject logger.
//

const environment = new Relay.Environment();

environment.injectNetworkLayer(Config.getNetworkLayer(errorHandler));


/**
 * Renders the application.
 * @param App Root component.
 */
function renderApp(App) {
  console.log('### [%s] ###', moment().format('hh:mm:ss'));

  // TODO(burdon): Get ID from config or const.
  const root = document.getElementById('app-container');

  ReactDOM.render(
    <App config={ Config } environment={ environment } errorHandler={ errorHandler }/>, root
  );
}


//
// React Hot Loader (3)
// https://github.com/gaearon/react-hot-boilerplate/pull/61
//

if (module.hot && _.get(config, 'debug.env') === 'hot') {

  // List modules that can be dynamically reloaded.
  module.hot.accept('./js/app/web/app', () => {
    renderApp(require('./js/app/web/app').default);
  });
}


//
// Start app.
//

renderApp(Application);

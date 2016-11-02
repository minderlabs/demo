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

import Config from './js/app/web/config';


//
// NOTE: Don't remove (needed to trigger webpack on schema changes).
//

import { VERSION } from './js/common/data/schema';

Config.set('debug.schema', VERSION);


//
// Error handling.
//

const errorHandler = ErrorHandler.init();


//
// Set network layer.
// NOTE: See looging in Chrome React devtools (can copy queries into GraphiQL).
// https://facebook.github.io/relay/docs/api-reference-relay.html#injectnetworklayer-static-method
// TODO(burdon): Inject logger.
//

Relay.injectNetworkLayer(Config.getNetworkLayer());


/**
 * Renders the application.
 * @param App Root component.
 */
function renderApp(App) {

  // TODO(burdon): Get ID from config or const.
  const root = document.getElementById('app-container');

  ReactDOM.render(
    <App config={ Config } errorHandler={ errorHandler }/>, root
  );
}


//
// Hot module reloading.
//

if (module.hot && _.get(config, 'debug.env') === 'hot') {
  const log = () => {
    console.log('### HMR[%s] ###', moment().format('hh:mm:ss'));
  };

  // List modules that can be dynamically reloaded.
  // https://github.com/gaearon/react-hot-boilerplate/pull/61
  // https://medium.com/@dan_abramov/hot-reloading-in-react-1140438583bf#.gvm6d2rd4
  module.hot.accept('./index.web.js');
  module.hot.accept('./js/app/web/app', () => {
    log();
    renderApp(require('./js/app/web/app').default);
  });

  log();
}


//
// Start app.
//

renderApp(Application);

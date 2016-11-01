//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';

import Application from './js/app/web/app';

import config from './js/app/web/config';

//
// NOTE: Don't remove (needed to trigger webpack on schema changes).
//

import { VERSION } from './js/common/data/schema';

_.set(config, 'schema.version', VERSION);

//
// Set network layer.
// NOTE: See looging in Chrome React devtools (can copy queries into GraphiQL).
// https://facebook.github.io/relay/docs/api-reference-relay.html#injectnetworklayer-static-method
// TODO(burdon): Inject logger.
//

Relay.injectNetworkLayer(config.getNetworkLayer());

//
// Start app.
//

function render() {
  ReactDOM.render(
    <Application config={ config }/>,

    // TODO(burdon): Get ID from config.
    document.getElementById('app-container')
  );
}

if (process.env.NODE_ENV === 'development' && module.hot) {
  console.log('### HMR mode ###');

  // https://github.com/gaearon/react-hot-boilerplate/pull/61
  // https://medium.com/@dan_abramov/hot-reloading-in-react-1140438583bf#.gvm6d2rd4

  module.hot.accept('./js/app/web/app', () => {
    require('./js/app/web/app');

    render();
  });
}

render();

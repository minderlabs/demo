//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import { applyRouterMiddleware, browserHistory, Router } from 'react-router';
import useRelay from 'react-router-relay';

import config from './js/app/web/config';
import routes from './js/app/web/routes';

//
// Set network layer.
//

Relay.injectNetworkLayer(config.getNetworkLayer());

//
// Start app.
// https://facebook.github.io/relay/docs/api-reference-relay-renderer.html#content
//

ReactDOM.render(
  <Router
    history={ browserHistory }
    routes={ routes }
    render={ applyRouterMiddleware(useRelay) }
    environment={ Relay.Store }
  />,

  // TODO(burdon): Get ID from config.
  document.getElementById('app-container')
);

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import Relay from 'react-relay';
import ReactDOM from 'react-dom';

import DemoApp from './common/app/web/demo';
import AppHomeRoute from './common/app/web/routes';
import Reindex from './common/data/reindex';

Relay.injectNetworkLayer(Reindex.getRelayNetworkLayer());

ReactDOM.render(
  <Relay.Renderer
    environment={ Relay.Store }
    Container={ DemoApp }
    queryConfig={ new AppHomeRoute() }
  />,
  document.getElementById('app-container')
);

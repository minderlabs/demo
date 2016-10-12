//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TODO(burdon): Document.
import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';

import DemoApp from './common/app/web/demo';
import DemoAppHomeRoute from './common/app/web/routes';

ReactDOM.render(
  <Relay.Renderer
    environment={ Relay.Store }
    Container={ DemoApp }
    queryConfig={ new DemoAppHomeRoute() }
  />,
  document.getElementById('app-container')
);

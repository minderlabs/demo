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

// TODO(burdon): Server and testing.
// https://facebook.github.io/relay/docs/guides-network-layer.html#custom-network-layers
// https://github.com/relay-tools/relay-local-schema

// TODO(burdon): Python relay server (bridge to DGraph, RethinkDB).
// https://github.com/graphql-python/graphql-relay-py

ReactDOM.render(
  <Relay.Renderer
    environment={ Relay.Store }
    Container={ DemoApp }
    queryConfig={ new DemoAppHomeRoute() }
  />,
  document.getElementById('app-container')
);

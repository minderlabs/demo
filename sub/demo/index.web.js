//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

import DemoApp from './common/app/web/demo';
import DemoAppHomeRoute from './common/app/web/routes';


const type = 'network';

if (type) {
  let networkLayer = null;

  switch (type) {
    case 'custom': {
      networkLayer = {
        sendMutation(mutationRequest) {
          console.log(mutationRequest);
        },
        sendQueries(queryRequests) {
          // TODO(burdon): Run directly against DGraph? Rewrite (e.g., fragments?)
          for (let queryRequest of queryRequests) {
            console.log(queryRequest.getQueryString());
          }
        },
        supports(...options) {
          console.log(options);
        },
      };
      break;
    }

    case 'local': {
      // https://github.com/relay-tools/relay-local-schema
      // http://graphql.org/blog/rest-api-graphql-wrapper/#using-a-client-side-schema-with-relay
      let { Schema } = require('./common/data/schema');
      console.log('Loaded', Schema);

      networkLayer = new RelayLocalSchema.NetworkLayer({
        // TODO(burdon): ERROR: Schema must be an instance of GraphQLSchema.
        // https://github.com/graphql/graphql-js/issues/159
        // MUST NOT HAVE 2 Versions:
        // node_modules/babel-relay-plugin/node_modules/graphql/graphql.js
        // node_modules/graphql/graphql.js
        schema: Schema,
      });
      break;
    }

    default:
    case 'network': {
      networkLayer = new Relay.DefaultNetworkLayer('http://localhost:8080/graphql');
      break;
    }
  }

  // TODO(burdon): Enable proxy server (e.g., proxy to DGraph, ORM wrapper to Python /data frontend).
  // https://github.com/graphql-python/graphql-relay-py
  // http://graphql.org/blog/rest-api-graphql-wrapper
  // https://www.npmjs.com/package/react-relay-network-layer
  // http://graphql.org/blog
  // https://facebook.github.io/relay/docs/guides-network-layer.html#custom-network-layers
  // https://github.com/relay-tools/relay-local-schema

  Relay.injectNetworkLayer(networkLayer);
}

//
// Start app.
//

ReactDOM.render(
  <Relay.Renderer
    environment={ Relay.Store }
    Container={ DemoApp }
    queryConfig={ new DemoAppHomeRoute() }
  />,
  document.getElementById('app-container')
);

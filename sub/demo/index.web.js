//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';
import { applyRouterMiddleware, browserHistory, Router } from 'react-router';
import useRelay from 'react-router-relay';

import routes from './javascript/common/app/web/routes';

//
// Set Relay network layer.
//
// TODO(burdon): Enable proxy server (e.g., proxy to DGraph, ORM wrapper to Python /data frontend).
// https://facebook.github.io/relay/docs/guides-network-layer.html
// http://graphql.org/blog/rest-api-graphql-wrapper
// http://graphql.org/blog
// https://github.com/graphql-python/graphql-relay-py
// https://www.npmjs.com/package/react-relay-network-layer
// https://github.com/relay-tools/relay-local-schema
//

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
      const schema = require('./javascript/common/data/schema');

      networkLayer = new RelayLocalSchema.NetworkLayer({
        // TODO(burdon): ERROR: Schema must be an instance of GraphQLSchema.
        // https://github.com/graphql/graphql-js/issues/159
        // MUST NOT HAVE 2 Versions:
        // node_modules/babel-relay-plugin/node_modules/graphql/graphql.js
        // node_modules/graphql/graphql.js
        schema
      });
      break;
    }

    default:
    case 'network': {
      networkLayer = new Relay.DefaultNetworkLayer('http://localhost:8080/debug/graphql');
      break;
    }
  }

  Relay.injectNetworkLayer(networkLayer);
}

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

  document.getElementById('app-container')
);

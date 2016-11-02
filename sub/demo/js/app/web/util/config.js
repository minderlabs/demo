//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

//
// Default values.
//

const DEFAULTS = {
  relay: {
    path: '/graphql'
  }
};

/**
 * App configuration.
 */
class Config {

  constructor(config) {
    this._config = config;
  }

  toString() {
    return JSON.stringify(this._config);
  }

  get(path, defaultValue=undefined) {
    return _.get(this._config, path, defaultValue);
  }

  set(path, value) {
    _.set(this._config, path, value);
  }

  /**
   * Optionally injects different network layer for GrapQL comms.
   * https://facebook.github.io/relay/docs/guides-network-layer.html
   *
   * @returns {*}
   */
  getNetworkLayer(errorHandler) {
    switch (this.get('relay.network')) {

      // https://github.com/relay-tools/relay-local-schema
      // http://graphql.org/blog/rest-api-graphql-wrapper/#using-a-client-side-schema-with-relay
      case 'local': {
        // TODO(burdon): ERROR: Schema must be an instance of GraphQLSchema.
        // https://github.com/graphql/graphql-js/issues/159
        // MUST NOT HAVE 2 Versions:
        // node_modules/babel-relay-plugin/node_modules/graphql/graphql.js
        // node_modules/graphql/graphql.js

        const schema = require('../../../common/data/schema');
        return new RelayLocalSchema.NetworkLayer({
          schema
        });
      }

      // https://facebook.github.io/relay/docs/api-reference-relay.html#injectnetworklayer-static-method
      default: {
        let loc = window.location;
        let hostname = loc.hostname + (loc.port ? ':' + loc.port : '');
        let url = `${loc.protocol}//${hostname}${this.get('relay.path')}`;

        console.log('GraphQL:', url);
        return new CustomNetworkLayer(url, errorHandler).setLogging(this.get('debug.logging'));
      }
    }
  }
}

/**
 * Logging network layer.
 */
class CustomNetworkLayer extends Relay.DefaultNetworkLayer {

  // TODO(burdon): Custom properties (e.g., retryDelays).
  // TODO(burdon): https://github.com/nodkz/react-relay-network-layer
  constructor(url, errorHandler) {
    super(...arguments);

    this._errorHandler = errorHandler;
    this._logging = false;
  }

  setLogging(debug) {
    this._logging = debug;
    return this;
  }

  // https://facebook.github.io/relay/docs/interfaces-relay-mutation-request.html
  sendMutation(request) {
    if (this._logging) {
      // TODO(burdon): Get debug name.
      console.log('>>> REQ:\n%s\nvariables: %s',
          request.getQueryString(), JSON.stringify(request.getVariables(), 0, 2));
    }

    request
      .then(result => {
        console.log('<<< RES: %s', JSON.stringify(result, 0, 2));
      })
      .catch(error => {
        console.error('Network Error:', error);   // TODO(burdon): Move to error handler.
        this._errorHandler.onError(error);
      });

    return super.sendMutation(request);
  }
}

//
// Singleton instance.
//

export default new Config(_.defaultsDeep(window.config || {}, DEFAULTS));

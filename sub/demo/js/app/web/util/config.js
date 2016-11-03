//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import CustomNetworkLayer from './net';

//
// Default values.
//

const DEFAULTS = {
  relay: {
    path: CustomNetworkLayer.DEFAULT_PATH
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
  getNetworkLayer(eventHandler) {
    switch (this.get('relay.network')) {

      // https://github.com/relay-tools/relay-local-schema
      // http://graphql.org/blog/rest-api-graphql-wrapper/#using-a-client-side-schema-with-relay
      case 'testing': {
        return CustomNetworkLayer.testing();
      }

      default: {
        let loc = window.location;
        let hostname = loc.hostname + (loc.port ? ':' + loc.port : '');
        let url = `${loc.protocol}//${hostname}${this.get('relay.path')}`;

        console.log('GraphQL:', url);
        return new CustomNetworkLayer(url, eventHandler)
          .setLogging(this.get('debug.logging'));
      }
    }
  }
}

//
// Singleton instance.
//

export default new Config(_.defaultsDeep(window.config || {}, DEFAULTS));

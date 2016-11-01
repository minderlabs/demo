//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

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

  getNetworkLayer() {
    switch (this.get('relay.network')) {

      // TODO(burdon): Experimental.
      case 'custom': {
        return {
          sendMutation(mutationRequest) {
            console.log(mutationRequest);
          },
          sendQueries(queryRequests) {
            for (let queryRequest of queryRequests) {
              console.log(queryRequest.getQueryString());
            }
          },
          supports(...options) {
            console.log(options);
          },
        };
      }

      // TODO(burdon): ERROR: Schema must be an instance of GraphQLSchema.
      // https://github.com/graphql/graphql-js/issues/159
      // MUST NOT HAVE 2 Versions:
      // node_modules/babel-relay-plugin/node_modules/graphql/graphql.js
      // node_modules/graphql/graphql.js
      case 'local': {
        const schema = require('../../common/data/schema');

        // https://github.com/relay-tools/relay-local-schema
        // http://graphql.org/blog/rest-api-graphql-wrapper/#using-a-client-side-schema-with-relay
        return new RelayLocalSchema.NetworkLayer({
          schema
        });
      }

      default: {
        let loc = window.location;
        let hostname = loc.hostname + (loc.port ? ':' + loc.port : '');
        let url = `${loc.protocol}//${hostname}${this.get('relay.path')}`;
        console.log('GraphQL:', url);
        return new Relay.DefaultNetworkLayer(url);
      }
    }
  }
}

export default new Config(_.defaultsDeep(window.config || {}, DEFAULTS));

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

// TODO(burdon): Factor out.
class Logger {

  static singleton = new Logger();

  request(request) {
    console.log('>>> REQ:\n%s\nvariables: %s',
      request.getQueryString(), JSON.stringify(request.getVariables(), 0, 2));
  }

  response(response) {
    console.log('<<< RES:\n%s',
      JSON.stringify(response, 0, 2));
  }
}

/**
 * Logging network layer.
 *
 * https://facebook.github.io/relay/docs/interfaces-relay-network-layer.html#content
 * https://facebook.github.io/relay/docs/api-reference-relay.html#injectnetworklayer-static-method
 */
export default class CustomNetworkLayer extends Relay.DefaultNetworkLayer {

  static DEFAULT_PATH = '/graphql';

  static testing() {
    // TODO(burdon): Cannot read property 'getViewer' of null
    // https://github.com/relay-tools/relay-local-schema
    const schema = require('../../../common/data/schema');
    return new RelayLocalSchema.NetworkLayer({
      schema,
      onError: (errors, request) => console.error(errors, request)
    });
  }

  // TODO(burdon): Custom properties (e.g., retryDelays).
  // TODO(burdon): https://github.com/nodkz/react-relay-network-layer

  constructor(url, eventHandler) {
    super(...arguments);

    this._eventHandler = eventHandler;
    this._logger = null;
  }

  // TODO(burdon): Allow app to toggle logging state.
  setLogging(debug) {
    this._logger = debug ? Logger.singleton : null;
    return this;
  }

  /**
   * https://facebook.github.io/relay/docs/interfaces-relay-network-layer.html#sendqueries
   * https://facebook.github.io/relay/docs/interfaces-relay-query-request.html#content
   * @param queryRequests
   * @returns {*}
   */
  sendQueries(queryRequests) {
    this._eventHandler.emit({
      type: 'net'
    });

    if (this._logger) {
      _.each(queryRequests, (queryRequest) => {
        this._logger.request(queryRequest);

        queryRequest.then(result => {
          this._logger.response(result.response);
        });
      });
    }

    return super.sendQueries(queryRequests);
  }

  /**
   * https://facebook.github.io/relay/docs/interfaces-relay-network-layer.html#sendmutation
   * https://facebook.github.io/relay/docs/interfaces-relay-mutation-request.html
   * @param mutationRequest
   * @returns {*}
   */
  sendMutation(mutationRequest) {
    this._eventHandler.emit({
      type: 'net'
    });

    if (this._logger) {
      this._logger.request(mutationRequest);
    }

    mutationRequest
      .then(result => {
        if (this._logger) {
          this._logger.response(result.response);
        }
      })
      .catch(error => {
        console.error('Network Error:', error);
        this._eventHandler.emit({
          type: 'error',
          error: error.message
        });
      });

    return super.sendMutation(mutationRequest);
  }
}

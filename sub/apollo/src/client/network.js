//
// Copyright 2016 Minder Labs.
//

'use strict';

import moment from 'moment';

import { createNetworkInterface } from 'apollo-client';

import { TypeUtil } from 'minder-core';


// TODO(burdon): Batching.
// https://github.com/apollostack/core-docs/blob/master/source/network.md#query-batching
const networkInterface = createNetworkInterface({
  uri: config.graphql
});


//
// Log request/response.
// http://dev.apollodata.com/core/network.html#networkInterfaceMiddleware
// TODO(burdon): Wrap with class.
//

let requestCount = 0;
const requestMap = new Map();
const requestIdHeader = 'x-req-id';

const TIMESTAMP = 'hh:mm:ss.SSS';

networkInterface.use([{
  applyMiddleware({ request, options }, next) {

    // Track request ID.
    // https://github.com/apollostack/apollo-client/issues/657
    const requestId = `${request.operationName}:${++requestCount}`;
    if (!options.headers) { options.headers = {}; }
    options.headers[requestIdHeader] = requestId;
    requestMap.set(requestId, request);

    console.log('[%s] >>> [%s]: %s', moment().format(TIMESTAMP),
      requestId, JSON.stringify(request.variables, TypeUtil.JSON_REPLACER));

    // TODO(burdon): Paging bug when non-null text filter.
    // https://github.com/apollostack/apollo-client/issues/897
    // "There can only be one fragment named ItemFragment" (from server).
    let definitions = {};
    request.query.definitions = _.filter(request.query.definitions, (definition) => {
      let name = definition.name.value;
      if (definitions[name]) {
        console.warn('SKIPPING: %s', name);
        return false;
      } else {
        definitions[name] = true;
        return true;
      }
    });

    next();
  }
}]);

//
// http://dev.apollodata.com/core/network.html#networkInterfaceAfterware
// https://github.com/apollostack/apollo-client/issues/657
//

networkInterface.useAfter([{
  applyAfterware({ response, options }, next) {
    const requestId = options.headers[requestIdHeader];
    const request = requestMap.get(requestId);
    requestMap.delete(requestId);

    // https://github.com/apollostack/core-docs/issues/224
    // https://developer.mozilla.org/en-US/docs/Web/API/Response/clone
    if (!response.ok) {
      response.clone().text().then(bodyText => {
        console.error(`Network Error [ ${response.status}]: (${response.statusText}) (${bodyText})`);
        next();
      });
    } else {
      response.clone().json().then((result) => {
        let { data, errors } = result;

        if (errors) {
          console.error('GraphQL Error [%s]:', requestId, errors.map(error => error.message));
        } else {
          console.log('[%s] <<< [%s]', moment().format(TIMESTAMP),
            requestId, JSON.stringify(data, TypeUtil.JSON_REPLACER));
        }

        next();
      });
    }
  }
}]);


export default networkInterface;

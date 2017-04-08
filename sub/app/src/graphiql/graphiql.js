//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';

import GraphiQL from 'graphiql';

import { HttpUtil } from 'minder-core';

import './graphiql.less';

console.log('Config = %s', JSON.stringify(window.config) );

//
// Set request headers (incl. Auth and client ID).
//

let headers = _.assign({
  'Accept':       'application/json',
  'Content-Type': 'application/json'
}, window.config.headers);

//
// Custom fetcher.
// https://github.com/graphql/graphiql#getting-started
//

function graphQLFetcher(graphQLParams) {
  return fetch('/graphql', {
    method: 'post',
    headers: headers,
    credentials: 'include',
    body: JSON.stringify(graphQLParams)
  }).then(function(response) {
    return response.text();
  }).then(function(responseBody) {
    try {
      return JSON.parse(responseBody);
    } catch(error) {
      return responseBody;
    }
  });
}

//
// Decode URL.
//

let parameters = HttpUtil.parseUrlParams(window.location.search);

//
// Encode URL.
//

function updateURL(update) {
  history.replaceState(null, null, '?' + HttpUtil.toUrlArgs(_.assign(parameters, update)));
}

//
// See node_modules/graphiql/README
// https://raw.githubusercontent.com/graphql/graphiql/master/example/index.html
//

const defQuery = 'query { viewer { user { id } } }';

ReactDOM.render(
  React.createElement(GraphiQL, {
    fetcher: graphQLFetcher,

    query: parameters.query || defQuery,
    variables: parameters.variables ? JSON.stringify(JSON.parse(parameters.variables), 0, 2) : '',
    operationName: parameters.operationName,

    onEditQuery: query => updateURL({ query }),
    onEditVariables: variables => updateURL({ variables }),
    onEditOperationName: operationName => updateURL({ operationName })
  }),

  document.getElementById('graphiql')
);

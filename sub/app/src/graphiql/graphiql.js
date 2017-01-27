//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import GraphiQL from 'graphiql';

import 'graphiql/graphiql.css';

console.log('Config = %s', JSON.stringify(window.config) );

let headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

// Add auth header.
window.config.headers.forEach(function(header) {
  headers[header.name] = header.value;
});

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
    } catch (error) {
      return responseBody;
    }
  });
}

//
// Decode URL.
//

let search = window.location.search;
let parameters = {};
search.substr(1).split('&').forEach(function(entry) {
  let eq = entry.indexOf('=');
  if (eq >= 0) {
    parameters[decodeURIComponent(entry.slice(0, eq))] = decodeURIComponent(entry.slice(eq + 1));
  }
});

// if variables was provided, try to format it.
if (parameters.variables) {
  try {
    parameters.variables = JSON.stringify(JSON.parse(parameters.variables), null, 2);
  } catch (ex) {
    // Do nothing.
  }
}

//
// Encode URL.
//

function onEditQuery(newQuery) {
  parameters.query = newQuery;
  updateURL();
}

function onEditVariables(newVariables) {
  parameters.variables = newVariables;
  updateURL();
}

function onEditOperationName(newOperationName) {
  parameters.operationName = newOperationName;
  updateURL();
}

// TODO(burdon): Factor out and use in client to provide links.
function updateURL() {
  let newSearch = '?' + Object.keys(parameters).filter(function(key) {
    return Boolean(parameters[key]);
  }).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(parameters[key]);
  }).join('&');

  history.replaceState(null, null, newSearch);
}

//
// See node_modules/graphiql/README
// https://raw.githubusercontent.com/graphql/graphiql/master/example/index.html
//

const defQuery = 'query { viewer { id } }';

ReactDOM.render(
  React.createElement(GraphiQL, {
    fetcher: graphQLFetcher,

    query: parameters.query || defQuery,
    variables: parameters.variables,
    operationName: parameters.operationName,

    onEditQuery: onEditQuery,
    onEditVariables: onEditVariables,
    onEditOperationName: onEditOperationName
  }),

  document.getElementById('graphiql')
);

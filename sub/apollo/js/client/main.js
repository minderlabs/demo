//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';

import ApolloClient from 'apollo-client';
import { ApolloProvider } from 'react-apollo';

import App from './app';

// TODO(burdon): React Router.

const config = window.config;

const reducers = (state=[], action) => {
  return state;
};

// https://github.com/reactjs/redux/blob/master/docs/api/createStore.md
const store = createStore(reducers);

const client = new ApolloClient();

ReactDOM.render(
  <ApolloProvider store={ store } client={ client }>
    <App/>
  </ApolloProvider>,

  document.getElementById(config.root)
);

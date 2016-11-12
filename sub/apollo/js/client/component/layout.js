//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { Match, Miss, Redirect } from 'react-router';
import { withApollo } from 'react-apollo';
import ApolloClient from 'apollo-client';

import Monitor from './devtools';
import Home from './home';

import './layout.less';

/**
 * Root Application.
 */
@withApollo
export default class Layout extends React.Component {

  static propTypes = {
    client: React.PropTypes.instanceOf(ApolloClient).isRequired
  };

  constructor() {
    super(...arguments);

    // Provided by @withApollo
    // http://dev.apollodata.com/react/higher-order-components.html#withApollo
    // http://dev.apollodata.com/core/apollo-client-api.html#ObservableQuery.refetch
    console.log('State = %s', JSON.stringify(this.props.client.store.getState()['minder'], (key, value) => {
      return value;
    }));
  }

  render() {

    // TODO(burdon): Skip DevTools in prod.
    // TODO(burdon): Display errors in status bar?

    return (
      <div className="app-main-container">
        <div className="app-main-panel">
          <div className="app-section">
            <h1>Apollo React Redux Demo</h1>
          </div>

          <div className="app-column">
            <Match pattern="/home" component={ Home }/>
            <Miss render={ () => <Redirect to="/home"/> }/>
          </div>

          <div className="app-debug">
            <Monitor/>
          </div>
        </div>
      </div>
    );
  }
}

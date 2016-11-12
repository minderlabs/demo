//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { Link, Match, Miss, Redirect } from 'react-router';
import { compose, withApollo } from 'react-apollo';
import ApolloClient from 'apollo-client';

import Detail from './view/detail';
import Home from './view/home';

import Monitor from './component/devtools';

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

    // TODO(burdon): Sidebar and query folders (available to views in redux state?)

    // TODO(burdon): Skip DevTools in prod.
    // TODO(burdon): Display errors in status bar.

    return (
      <div className="app-main-container">
        <div className="app-main-panel">

          <div className="app-section app-header app-row">
            <div className="app-expand">
              <h1>Apollo Demo</h1>
            </div>
            <div>
              <Link to="/inbox">Inbox</Link>
              <Link to="/favorites">Favorites</Link>
            </div>
          </div>

          <div className="app-column">
            <Match pattern="/:folder" component={ Home }/>
            <Match pattern="/detail/:itemId" component={ Detail }/>
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

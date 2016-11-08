//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';

//
// Queries
//

// TODO(burdon): DevTools.

const Query = gql`
  query user($userId: ID!) { 
    user(id: $userId) {
      id
      name
    }
  }
`;

/**
 * Home View.
 * http://dev.apollodata.com/react
 * http://dev.apollodata.com/react/higher-order-components.html
 */
@withApollo
@graphql(Query, {

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  options: (props) => {
    let state = props.client.store.getState()['minder'];
    return {
      variables: {
        userId: state.userId
      }
    };
  }
})
export default class Home extends React.Component {

  static propTypes = {
    data: React.PropTypes.shape({
      loading: React.PropTypes.bool.isRequired,

      // Query result.
      user: React.PropTypes.object
    })
  };

  handleRefresh() {
    // http://dev.apollodata.com/core/apollo-client-api.html#QuerySubscription
    this.props.data.refetch();
  }

  render() {
    let state = this.props.client.store.getState()['minder'];

    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { user } = this.props.data;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-column">
        <h2>Home</h2>

        <div className="app-expand">
          <div>
            <h3>Request</h3>
            <pre>{ JSON.stringify(state) }</pre>
          </div>

          <div>
            <h3>Response</h3>
            <pre>{ JSON.stringify(user) }</pre>
          </div>
        </div>

        <div className="app-row">
          <div className="app-expand">
            <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
          </div>

          <div>{ this.props.data.loading ? 'Loading...' : '' }</div>
        </div>
      </div>
    );
  }
}

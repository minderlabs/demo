//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';

import List from './list';
import Search from './search';


//
// Queries
//

// TODO(burdon): DevTools.
// TODO(burdon): Logging (and error handling).

const Query = gql`
  query Home($userId: ID!) { 

    viewer(userId: $userId) {
      id
      user {
        name
      }
    }
  }
`;


/**
 * Home View.
 * http://dev.apollodata.com/react
 *
 * NOTES
 * @graphql creates a "Higher Order Component" (i.e., a smart container that wraps the "dumb" React component).
 * http://dev.apollodata.com/react/higher-order-components.html
 *
 * TODO(burdon): Does this replace Redux connect()?
 */
@withApollo
@graphql(Query, {

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  options: (props) => {
    let state = props.client.store.getState()['minder'];
    console.assert(state.userId);
    return {
      variables: {
        userId: state.userId
      }
    };
  }
})
class Home extends React.Component {

  static propTypes = {

    // Provided by apollo.
    // http://dev.apollodata.com/react/queries.html#default-result-props
    data: React.PropTypes.shape({
      loading: React.PropTypes.bool.isRequired,

      // Query result.
      viewer: React.PropTypes.object
    })
  };

  handleRefresh() {
    // http://dev.apollodata.com/core/apollo-client-api.html#QuerySubscription
    this.props.data.refetch();
  }

  render() {
    let state = this.props.client.store.getState()['minder'];

    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { viewer } = this.props.data;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-column">
        <h2>Home</h2>

        <div className="app-expand">
          <div>
            <Search/>
          </div>

          <div>
            <h3>State</h3>
            <pre>{ JSON.stringify({ foo: this.props.foo }) }</pre>
          </div>

          <div>
            <h3>Request</h3>
            <pre>{ JSON.stringify(state) }</pre>
          </div>

          <div>
            <h3>Response</h3>
            <pre>{ JSON.stringify(viewer) }</pre>
          </div>

          <div>
            <List/>
          </div>
        </div>

        <div className="app-row">
          <div className="app-row app-expand">
            <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
            <button onClick={ this.props.handleFoo.bind(null, true) }>Foo</button>
          </div>

          <div>
            <div>{ this.props.data.loading ? 'LOADING' : this.props.data.error ? 'ERROR' : 'OK' }</div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Map Redux state onto component properties.
 * NOTE: Using @withApollo we could access this via props.client.store (==state)
 *
 * @param state
 * @param ownProps
 * @returns {{active: string}}
 */
const mapStateToProps = (state, ownProps) => {
  return {
    userId: state.minder.userId,
    foo:    state.minder.foo
  }
};

/**
 * Provide handlers that will dispatch Redux actions.
 *
 * @param dispatch
 * @param ownProps
 * @returns {{onClick: (function())}}
 */
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    // TODO(burdon): Move to SearchBar.
    handleFoo: (value) => {
      dispatch({ type: 'MINDER_FOO', value });   // TODO(burdon): Factor out (and def consts).
    }
  }
};

//
// Connect creates the Redux Higher Order Object.
// NOTE: This keeps the Component dry (it defines the properties that it needs).
//
// http://redux.js.org/docs/basics/UsageWithReact.html
// http://redux.js.org/docs/basics/ExampleTodoList.html
//

// TODO(burdon): Move apollo defs here? Or use compose?
// http://dev.apollodata.com/react/higher-order-components.html#compose

export default connect(mapStateToProps, mapDispatchToProps)(Home);

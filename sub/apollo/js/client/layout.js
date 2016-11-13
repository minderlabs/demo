//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { Link, Match, Miss, Redirect } from 'react-router';
import { connect } from 'react-redux';
import { compose, graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

import Detail from './view/detail';
import Home from './view/home';

import Monitor from './component/devtools';

import './layout.less';

/**
 * Root Application.
 */
@withApollo
class Layout extends React.Component {

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

//
// Queries
//

const Query = gql`
  query Layout($userId: ID!) { 

    viewer(userId: $userId) {
      id
      user {
        title
      }
    }
  }
`;

//
// Chain:
// 1). Redux.connect(mapStateToProps(state)) => component.props
// 2). => graphql.options(props) => query {variables}
// 3). => graphql.props(oldProps, data) =>
//
// 1). Redux connect(mapStateToProps(state)) maps the app state to the components props.
// 2). Apollo graphql(options(props)) maps component props to query variables.
// 3). Apollo graphql(props(oldProps, data)) replaces the component's data property with custom
//     properties (e.g., adding dispatcher).

/**
 * Map Redux state onto component properties.
 * Called whenever the state is updated via a reducer.
 * The component is rerendered if DIRECT objects that are accessed are updated.
 *
 * http://stackoverflow.com/questions/36815210/react-rerender-in-redux
 * http://redux.js.org/docs/FAQ.html#react-rendering-too-often
 * https://github.com/markerikson/redux-ecosystem-links/blob/master/devtools.md#component-update-monitoring
 *
 * @param state
 * @param ownProps
 * @returns {{active: string}}
 */
const mapStateToProps = (state, ownProps) => {
  return {
    userId: state.minder.userId
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {}
};

/**
 * Connect creates the Redux Higher Order Object.
 * NOTE: This keeps the Component dry (it defines the properties that it needs).
 *
 * http://redux.js.org/docs/basics/UsageWithReact.html
 * http://redux.js.org/docs/basics/ExampleTodoList.html
 */
export default compose(
  connect(mapStateToProps, mapDispatchToProps),

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  graphql(Query, {
    options: (props) => {
      return {
        variables: {
          userId: props.userId
        }
      };
    }
  })

)(Layout);

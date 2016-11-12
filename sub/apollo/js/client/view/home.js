//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { ACTION } from '../reducers';

import List from '../component/list';
import Search from '../component/search';

/**
 * Home View.
 * http://dev.apollodata.com/react
 *
 * NOTES
 * @graphql creates a "Higher Order Component" (i.e., a smart container that wraps the "dumb" React component).
 * http://dev.apollodata.com/react/higher-order-components.html
 */
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

  handleItemSelect(item) {
    this.props.navigate(item.id);
  }

  render() {
    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { viewer } = this.props.data;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-column">
        <div className="app-section">
          <Search/>
        </div>

        <div className="app-section app-expand">
          <List onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        <div className="app-section app-row">
          <div className="app-row app-expand">
            <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
          </div>

          <div>
            <div>{ this.props.data.loading ? 'LOADING' : this.props.data.error ? 'ERROR' : 'OK' }</div>
          </div>
        </div>
      </div>
    );
  }
}

//
// Queries
// TODO(burdon): List fragment.
//

const Query = gql`
  query Home($userId: ID!) { 

    viewer(userId: $userId) {
      id
      user {
        title
      }
    }
  }
`;

/**
 * Map Redux state onto component properties.
 * Called whenever the state is updated via a reducer.
 * The component is rerendered if DIRECT objects that are accessed are updated.
 *
 * @param state
 * @param ownProps
 * @returns {{active: string}}
 */
const mapStateToProps = (state, ownProps) => {

  // http://stackoverflow.com/questions/36815210/react-rerender-in-redux
  // http://redux.js.org/docs/FAQ.html#react-rendering-too-often
  // https://github.com/markerikson/redux-ecosystem-links/blob/master/devtools.md#component-update-monitoring

  return {
    userId: state.minder.userId
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    navigate: (itemId) => {
      dispatch({
        type: ACTION.NAVIGATE,
        location: {
          pathname: '/detail/' + itemId  // TODO(burdon): Const.
        },
        action: 'PUSH'
      });
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

)(Home);

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

  handleRefresh() {
    // TODO(burdon): Refetch list.
    // http://dev.apollodata.com/core/apollo-client-api.html#QuerySubscription
    this.props.refetch();
  }

  handleItemSelect(item) {
    this.props.navigate(item.id);
  }

  render() {
    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { filter } = this.props;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-column">
        <div className="app-section">
          <Search/>
        </div>

        <div className="app-section app-expand">
          <List filter={ filter } onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        <div className="app-section app-row">
          <div className="app-row app-expand">
            <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
          </div>

          <div>
            <div>{ this.props.loading ? 'LOADING' : this.props.error ? 'ERROR' : 'OK' }</div>
          </div>
        </div>
      </div>
    );
  }
}

//
// Queries
//

// TODO(burdon): Factor out filter fragment (cannot request all).

const Query = gql`
  query Home($userId: ID!) { 

    viewer(userId: $userId) {
      id
      user {
        title
      }
    }
    
    folders(userId: $userId) {
      id
      filter {
        type
        labels
        text
      }
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
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
          pathname: '/detail/' + itemId   // TODO(burdon): Const.
        },
        action: 'PUSH'
      });
    }
  }
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),

  graphql(Query, {

    options: (props) => {
      return {
        variables: {
          userId: props.userId
        }
      };
    },

    props: ({ data, ownProps }) => {
      let { loading, error, refetch, folders } = data;

      // Match current folder.
      // TODO(burdon): Handler error/redirect if not found.
      let filter = {};
      _.each(folders, (folder) => {
        // TODO(burdon): Match folder's short name rather than ID.
        if (folder.id == ownProps.params.folder) {
          filter = _.omit(folder.filter, '__typename');
          return false;
        }
      });

      return {
        loading,
        error,
        refetch,
        folders,
        filter
      }
    }
  })

)(Home);

//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import Database from '../../data/database';
import { ACTION } from '../reducers';

import List from '../component/list';
import Search from '../component/search';

/**
 * Folder View.
 * http://dev.apollodata.com/react
 *
 * NOTES
 * @graphql creates a "Higher Order Component" (i.e., a smart container that wraps the "dumb" React component).
 * http://dev.apollodata.com/react/higher-order-components.html
 */
class FolderView extends React.Component {

  static contextTypes = {
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {

    data: React.PropTypes.shape({

      viewer: React.PropTypes.object.isRequired,
      folders: React.PropTypes.array.isRequired
    })
  };

  handleSearch(text) {
    this.props.onSearch(text);
  }

  handleItemSelect(item) {
    this.props.navigateItem(item);
  }

  render() {
    console.log('Folder.render');

    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { filter } = this.props;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-column">
        <div className="app-section">
          <Search value={ this.props.search.text } onSearch={ this.handleSearch.bind(this) }/>
        </div>

        <div className="app-section app-expand">
          <List filter={ filter } onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>
      </div>
    );
  }
}

//
// Queries
//

// TODO(burdon): Factor out filter fragment (move to Layout).

const FolderQuery = gql`
  query FolderQuery($userId: ID!) { 

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
    userId: state.minder.userId,
    search: state.minder.search
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onSearch: (value) => {
      dispatch({ type: ACTION.SEARCH, value });
    },

    navigateItem: (item) => {
      dispatch({
        type: ACTION.NAVIGATE,
        location: {
          // TODO(burdon): Const path.
          pathname: '/item/' + Database.toGlobalId(item.type, item.id)
        },
        action: 'PUSH'
      });
    }
  }
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),

  graphql(FolderQuery, {

    options: (props) => {
      console.log('*** Folder options ***', JSON.stringify(props));

      return {
        variables: {
          userId: props.userId
        }
      };
    },

    props: ({ ownProps, data }) => {
      let { loading, error, refetch, folders } = data;

      // TODO(burdon): This happens too late. On load, options above has no filter and causes the list
      // to be rendered, then we are called and update the filter resulting in flickering results (2 server calls).

      // TODO(burdon): Solution is set the redux state in the layout? so can be used above in props?

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

)(FolderView);

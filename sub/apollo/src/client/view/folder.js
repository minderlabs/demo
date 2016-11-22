//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux'
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { ID, IdGenerator } from 'minder-core';
import { TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../data/mutation';

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
    onSearch: React.PropTypes.func.isRequired,
    navigateItem: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({
      folders: React.PropTypes.array.isRequired
    })
  };

  handleSearch(text) {
    this.props.onSearch(text);
  }

  handleItemSelect(item) {
    this.props.navigateItem(item);
  }

  handleItemCreate() {
    let title = _.trim(this.refs.text.value);
    if (title) {
      let mutation = [
        {
          field: 'title',
          value: {
            string: title
          }
        }
      ];

      // TODO(burdon): Get type from picker.
      this.props.createItem('Task', mutation);

      this.refs.text.value = '';
      this.refs.text.focus();
    }
  }

  render() {
    console.log('Folder.render');

    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { filter } = this.props;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-column">
        <div className="app-section">
          <Search value={ this.props.search.text }
                  onSearch={ this.handleSearch.bind(this) }/>
        </div>

        <div className="app-section app-expand">
          <List filter={ filter } onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        <div className="app-section app-row">
          <TextBox ref="text" className="app-expand"
                   onKeyDown={ TextBox.filter(13, this.handleItemCreate.bind(this)) }/>
          <i className="app-icon-add material-icons"
             onClick={ this.handleItemCreate.bind(this) }/>
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
  let { minder } = state;

  return {
    idGenerator: minder.injector.get(IdGenerator),
    userId: minder.userId,
    search: minder.search
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onSearch: (value) => {
      dispatch({ type: ACTION.SEARCH, value });
    },

    navigateItem: (item) => {
      // TODO(burdon): Const path.
      dispatch(push('/item/' + ID.toGlobalId(item.type, item.id)));
    }
  }
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),

  graphql(FolderQuery, {

    options: (props) => {
//    console.log('### Folder.options ', JSON.stringify(props));

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
  }),

  graphql(UpdateItemMutation, {
    props: ({ ownProps, mutate }) => ({
      createItem: (type, deltas) => {
        let itemId = ownProps.idGenerator.createId();     // TODO(burdon): IdGenerator from context?
//      console.log('#####', itemId);
        return mutate({
          variables: {
            itemId: ID.toGlobalId(type, itemId),
            deltas: deltas
          }
        });
      }
    })
  })

)(FolderView);

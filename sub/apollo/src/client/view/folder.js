//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux'
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { ID, QueryParser, Mutator } from 'minder-core';
import { SearchBar, TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../data/mutations';

import { Path } from '../path';
import { ACTION } from '../reducers';

import List from './component/list';

import './folder.less';

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
      let mutations = [
        {
          field: 'title',
          value: {
            string: title
          }
        }
      ];

      // TODO(burdon): Get type from picker.
      this.props.mutator.createItem('Task', mutations);

      this.refs.text.value = '';
      this.refs.text.focus();
    }
  }

  render() {
//  console.log('Folder.render');

    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { filter } = this.props;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-folder ux-column">
        <div className="ux-section">
          <SearchBar value={ this.props.search.text } onSearch={ this.handleSearch.bind(this) }/>
        </div>

        <div className="ux-section ux-expand">
          <List filter={ filter } onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        <div className="ux-section ux-row">
          <TextBox ref="text" className="ux-expand" onEnter={ this.handleItemCreate.bind(this) }/>
          <i className="ux-icon ux-icon-add" onClick={ this.handleItemCreate.bind(this) }/>
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
  query FolderQuery { 

    folders {
      id
      filter
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
//console.log('Folder.mapStateToProps: %s', JSON.stringify(Object.keys(ownProps)));

  let { injector, search } = state.minder;
  let queryParser = injector.get(QueryParser);
  let filter = queryParser.parse(search.text);

  return {
    // Provide for Mutator.graphql
    injector,
    filter,
    search
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {

    // Store search state (so can restore value when nav back).
    onSearch: (value) => {
      dispatch({ type: ACTION.SEARCH, value });
    },

    // Navigate to detail view.
    navigateItem: (item) => {
      dispatch(push(Path.detail(item.type, ID.toGlobalId(item.type, item.id))));
    }
  }
};

export default compose(

  // Redux.
  connect(mapStateToProps, mapDispatchToProps),

  // Query.
  graphql(FolderQuery, {

    // Configure props passed to component.
    // http://dev.apollodata.com/react/queries.html#graphql-props
    props: ({ ownProps, data }) => {
//    console.log('Folder.props: ', JSON.stringify(Object.keys(data)));

      let { loading, error, refetch, folders } = data;
      let { filter } = ownProps;

      // TODO(burdon): This happens too late. On load, options above has no filter and causes the list
      // to be rendered, then we are called and update the filter resulting in flickering results (2 server calls).
      // TODO(burdon): List should return zero items if no filter.
      // TODO(burdon): Solution is set the redux state in the layout? so can be used above in props?
      // TODO(burdon): Handler error/redirect if not found.

      // Create list filter (if not overridden by text search above).
      if (QueryParser.isEmpty(filter)) {
        _.each(folders, (folder) => {
          // TODO(burdon): Match folder's short name rather than ID.
          if (folder.id == ownProps.params.folder) {
            filter = JSON.parse(folder.filter);
            return false;
          }
        });
      }

      return {
        loading,
        error,
        refetch,
        folders,
        filter: QueryParser.trim(filter)
      }
    }
  }),

  // Mutator.
  Mutator.graphql(UpdateItemMutation),

)(FolderView);

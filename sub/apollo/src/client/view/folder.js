//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { QueryParser, Mutator, TypeUtil } from 'minder-core';
import { TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../data/mutations';

import { SearchList } from '../component/list_factory';

import './folder.less';

/**
 * Folder View.
 * http://dev.apollodata.com/react
 *
 * NOTES:
 * @graphql creates a "Higher Order Component" (i.e., a smart container that wraps the "dumb" React component).
 * http://dev.apollodata.com/react/higher-order-components.html
 */
class FolderView extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object,
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {
    user: React.PropTypes.object.isRequired,          // TODO(burdon): Add to all types.

    data: React.PropTypes.shape({
      folders: React.PropTypes.array.isRequired
    })
  };

  handleItemSelect(item) {
    this.context.navigator.pushDetail(item);
  }

  handleItemCreate() {
    let { user, team, filter } = this.props;

    let title = _.trim(this.refs.text.value);
    if (title) {

      // TODO(burdon): If no type then hide create button.
      let type = _.get(filter, 'type', 'Task');

      // Basic mutation.
      let mutations = [
        {
          field: 'title',
          value: {
            string: title
          }
        }
      ];

      // TODO(burdon): Factor out type-specific fields.
      switch (type) {
        case 'Project': {
          TypeUtil.append(mutations, [
            {
              field: 'team',
              value: {
                id: team
              }
            }
          ]);
          break;
        }

        case 'Task': {
          TypeUtil.append(mutations, [
            {
              field: 'owner',                         // TODO(burdon): Promote for all items?
              value: {
                id: user.id
              }
            },
            {
              field: 'labels',
              value: {
                array: {
                  index: 0,
                  value: {
                    string: '_private'    // TODO(burdon): By default?
                  }
                }
              }
            }
          ]);
          break;
        }
      }

      this.props.mutator.createItem(type, mutations);

      this.refs.text.value = '';
      this.refs.text.focus();
    }
  }

  render() {
//  console.log('Folderg.render');

    // http://dev.apollodata.com/react/queries.html#default-result-props
    let { filter } = this.props;

    // TODO(burdon): Move statusbar (e.g., loading, network stats) to parent layout.

    return (
      <div className="app-folder ux-column">
        <div className="ux-expand">
          <SearchList filter={ filter } shouldAggregate={ false } onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        <div className="ux-section ux-toolbar ux-row">
          <TextBox ref="text" className="ux-expand" onEnter={ this.handleItemCreate.bind(this) }/>
          <i className="ux-icon ux-icon-add" onClick={ this.handleItemCreate.bind(this) }/>
        </div>
      </div>
    );
  }
}

//
// Queries.
//

const FoldersQuery = gql`
  query FoldersQuery { 

    folders {
      id
      alias
      filter
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
//console.log('Folder.mapStateToProps: %s', JSON.stringify(Object.keys(ownProps)));

  // NOTE: Search state come from dispatch via SearchBar.
  let { injector, search, user, team } = state.minder;
  let queryParser = injector.get(QueryParser);
  let filter = queryParser.parse(search.text);

  return {
    // Provide for Mutator.graphql
    injector,
    filter,
    search,
    user,
    team
  }
};

export default compose(

  // Redux.
  connect(mapStateToProps),

  // Query.
  graphql(FoldersQuery, {

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
        _.each(folders, folder => {
          // TODO(burdon): Match folder's alias.
          if (folder.alias == ownProps.params.folder) {
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
        filter
      }
    }
  }),

  // Mutator.
  Mutator.graphql(UpdateItemMutation),

)(FolderView);

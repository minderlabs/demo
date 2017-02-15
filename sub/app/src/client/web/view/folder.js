//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { QueryParser, Mutator, UpdateItemMutation } from 'minder-core';

import { AppAction, ContextAction } from '../reducers';
import { BasicSearchList, BasicListItemRenderer, DebugListItemRenderer, CardSearchList } from '../framework/list_factory';
import { TypeRegistry } from '../framework/type_registry';
import { Card } from '../component/card';

import './folder.less';

/**
 * Folder View.
 */
class FolderView extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  handleItemUpdate(item, mutations) {
    this.props.mutator.updateItem(item, mutations);
  }

  render() {
    let { typeRegistry, filter, listType } = this.props;

    let list;
    switch (listType) {
      case 'card':
        list = <CardSearchList filter={ filter }
                               highlight={ false }
                               itemRenderer={ Card.ItemRenderer(typeRegistry) }
                               onItemSelect={ this.handleItemSelect.bind(this) }
                               onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
        break;

      case 'list':
      default:
        list = <BasicSearchList filter={ filter }
                                groupBy={ true }
//                              itemRenderer={ DebugListItemRenderer }
                                itemRenderer={ BasicListItemRenderer(typeRegistry) }
                                onItemSelect={ this.handleItemSelect.bind(this) }
                                onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
    }

    return (
      <div className="app-folder-view ux-column">
        { list }
      </div>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const FoldersQuery = gql`
  query FoldersQuery { 

    viewer {
      folders {
        id
        alias
        filter
      }
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { config, injector, search, user, group } = AppAction.getState(state);
  let { context } = ContextAction.getState(state);

  let typeRegistry = injector.get(TypeRegistry);
  let queryParser = injector.get(QueryParser);
  let filter = queryParser.parse(search.text);

  // TODO(burdon): Move to layout config.
  let listType = _.get(config, 'app.platform') == 'crx' ? 'card' : 'list';

  // Use contextual filter.
  if (context && context.filter) {
    filter = context.filter
  }

  return {
    // TODO(burdon): Wrap connect to provide injector for for Mutator.graphql
    // AppAction.connect(mapStateToProps),
    injector,

    listType,
    typeRegistry,
    filter,
    search,
    user,
    group
  }
};

export default compose(

  // Redux.
  connect(mapStateToProps),

  // Query.
  graphql(FoldersQuery, {

    // Configure props passed to component.
    // http://dev.apollodata.com/react/queries.html#graphql-props
    // http://dev.apollodata.com/react/queries.html#default-result-props
    props: ({ ownProps, data }) => {
      let { filter } = ownProps;
      let { viewer } = data;

      // Create list filter (if not overridden by text search above).
      if (viewer && QueryParser.isEmpty(filter)) {
        _.each(viewer.folders, folder => {
          if (folder.alias == ownProps.folder) {
            filter = JSON.parse(folder.filter);
            return false;
          }
        });
      }

      return {
        filter
      }
    }
  }),

  // Mutator.
  Mutator.graphql(UpdateItemMutation),

)(FolderView);

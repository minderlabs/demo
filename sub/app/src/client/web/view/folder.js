//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { QueryParser, Mutator, MutationUtil, TypeUtil, UpdateItemMutation } from 'minder-core';
import { List, TextBox } from 'minder-ux';

import { AppAction, ContextAction } from '../reducers';

import { BasicSearchList, BasicListItemRenderer, CardSearchList } from '../framework/list_factory';
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
    console.log(':::::::', item);
    this.context.navigator.pushCanvas(item);
  }

  handleItemUpdate(item, mutations) {
    this.props.mutator.updateItem(item, mutations);
  }

  handleItemCreate() {
    let { user, team, filter } = this.props;

    let title = _.trim(this.refs.text.value);
    if (title) {
      let mutations = [
        MutationUtil.createFieldMutation('title', 'string', title)
      ];

      switch (type) {
        case 'Project': {
          _.concat(mutations, [
            MutationUtil.createFieldMutation('team', 'id', team)
          ]);
          break;
        }

        case 'Task': {
          _.concat(mutations, [
            // TODO(burdon): Promote to all types.
            MutationUtil.createFieldMutation('owner', 'id', user.id),
            MutationUtil.createLabelMutation('_private')
          ]);
          break;
        }
      }

      // TODO(burdon): If no type then hide create button.
      let type = _.get(filter, 'type', 'Task');
      this.props.mutator.createItem(type, mutations);

      this.refs.text.value = '';
      this.refs.text.focus();
    }
  }

  render() {
    let { typeRegistry, filter, listType } = this.props;

    // TODO(burdon): Testing.
//  listType = 'card';

    // TODO(burdon): Get type from config.
    // TODO(burdon): Factor out for performance.
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
                                itemRenderer={ BasicListItemRenderer(typeRegistry) }
                                onItemSelect={ this.handleItemSelect.bind(this) }
                                onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
    }

    return (
      <div className="app-folder-view ux-column">
        { list }

        {/*
         TODO(burdon): (+) to add item (of specific type).
        <div className="ux-section ux-toolbar">
          <TextBox ref="text" className="ux-expand" onEnter={ this.handleItemCreate.bind(this) }/>
          <i className="ux-icon ux-icon-add" onClick={ this.handleItemCreate.bind(this) }/>
        </div>
        */}
      </div>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

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
  let { config, injector, search, user, team } = AppAction.getState(state);
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
    // http://dev.apollodata.com/react/queries.html#default-result-props
    props: ({ ownProps, data }) => {
      let { folders } = data;
      let { filter } = ownProps;

      // Create list filter (if not overridden by text search above).
      if (QueryParser.isEmpty(filter)) {
        _.each(folders, folder => {
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

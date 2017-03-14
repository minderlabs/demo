//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { IdGenerator, QueryParser, ItemFragment } from 'minder-core';
import { ReactUtil } from 'minder-ux';

import { Const } from '../../../common/defs';
import { AppAction, ContextAction } from '../../common/reducers';
import { ContextManager } from '../../common/context';

import { BasicSearchList, CardSearchList, BasicListItemRenderer } from '../framework/lists';
import { Card } from '../component/card';

import './finder.less';

/**
 * Finder.
 */
class Finder extends React.Component {

  static contextTypes = {
    typeRegistry: React.PropTypes.object.isRequired,
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  handleItemUpdate(item, mutations) {
    this.context.mutator.updateItem(item, mutations);
  }

  render() {
    return ReactUtil.render(this, () => {
      let { typeRegistry } = this.context;
      let { contextManager, filter, listType } = this.props;

      let debug = false && (
        <div className="ux-debug ux-font-xsmall">{ JSON.stringify(filter) }</div>
      );

      // Inject items into list if the context manager is present.
      let itemInjector = undefined;
      if (contextManager) {
        itemInjector = (items) => contextManager.injectItems(items);
      }

      let list;
      switch (listType) {
        case 'card':
          list = <CardSearchList filter={ filter }
                                 highlight={ false }
                                 className="ux-card-list"
                                 itemInjector={ itemInjector }
                                 itemRenderer={ Card.ItemRenderer(typeRegistry) }
                                 onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
          break;

        case 'list':
        default:
          list = <BasicSearchList filter={ filter }
                                  groupBy={ false }
                                  itemRenderer={ BasicListItemRenderer(typeRegistry) }
                                  onItemSelect={ this.handleItemSelect.bind(this) }
                                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
      }

      return (
        <div className="app-finder ux-column">
          { list }
          { debug }
        </div>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const FoldersQuery = gql`
  query FoldersQuery($filter: FilterInput!) {
    viewer {
      folders {
        type
        id
        alias
        filter
      }
    }
    
    contextItems: search(filter: $filter) {
      ...ItemFragment
    }
  }

  ${ItemFragment}
`;

const mapStateToProps = (state, ownProps) => {
  let { config, injector, search } = AppAction.getState(state);

  // Current user context (e.g., host page).
  let context = ContextAction.getState(state);

  // CRX app context.
  let contextManager = null;
  if (_.get(config, 'app.platform') === Const.PLATFORM.CRX) {
    // TODO(burdon): Binds to context action; should trigger context requery.
    contextManager = injector.get(ContextManager).updateContext(context);
  }

  // TODO(burdon): Move to layout config.
  let listType = _.get(config, 'app.platform') === Const.PLATFORM.CRX ? 'card' : 'list';

  // Required by Mutator.
  let idGenerator = injector.get(IdGenerator);

  // Construct filter (from sidebar context or searchbar).
  let queryParser = injector.get(QueryParser);
  let filter = queryParser.parse(search.text);
  if (context && context.filter && !search.text) {
    filter = context.filter
  }

  return {
    idGenerator,
    contextManager,
    listType,
    filter,
    search
  }
};

export default compose(

  // Redux.
  connect(mapStateToProps),

  // Query.
  graphql(FoldersQuery, {

    options: (props) => {
      let { contextManager } = props;

      // Lookup items from context.
      // TODO(burdon): Currently contact specific based on email.
      let filter = {};
      let emails = _.compact(_.map(_.get(contextManager.context, 'items'), item => item.email));
      if (emails.length) {
        filter = {
          type: 'Contact',
          expr: {
            op: 'OR',
            expr: _.map(emails, email => ({
              field: 'email',
              value: {
                string: email
              }
            }))
          }
        };
      }

      return {
        variables: {
          filter
        }
      };
    },

    // Configure props passed to component.
    // http://dev.apollodata.com/react/queries.html#graphql-props
    // http://dev.apollodata.com/react/queries.html#default-result-props
    props: ({ ownProps, data }) => {
      let { loading, error, viewer, contextItems } = data;
      let { contextManager, filter } = ownProps;

      // Update context.
      contextManager.updateItems(contextItems);

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
        loading,
        error,
        filter
      }
    }
  }),

)(Finder);
